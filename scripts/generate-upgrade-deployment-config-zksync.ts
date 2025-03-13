import {
  decodeApplyMultiTargetPermissions,
  decodeUpgradeTo,
  decodeUpgradeToAndCall,
  decodeCreateVersion,
  generateOSxConfig,
  generateAdminConfig,
  generateMultisigConfig,
  generateTokenVotingConfig,
  type Addresses,
} from "./lib.ts";

/*
Example input from data/upgrade-proposal-*-actions-decoded.json

[{
  "decoded": "1) \"applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])\"\n[(0, 0x96E54098317631641703404C06A5afAD89da7373, 0x9BC7f1dc3cFAD56a0EcD924D1f9e70f5C7aF0039, 0x0000000000000000000000000000000000000000, 0xde5e253d6956bc5fb69cfa564733633f4e53b143e42859306cd13cdc54856215)]"
}]
*/

const EXPECTED_ACTION_COUNT = 7;

async function main() {
  if (Deno.args.length !== 2) {
    console.error("Usage: deno run script.ts <file>.json <network>");
    Deno.exit(1);
  }

  const [filename, network] = Deno.args;
  let fileContent: string;

  try {
    fileContent = await Deno.readTextFile(filename);
  } catch (error) {
    console.error(`Error reading file "${filename}": ${error.message}`);
    Deno.exit(1);
  }

  const actions = JSON.parse(fileContent!);
  if (!Array.isArray(actions) || actions.length !== EXPECTED_ACTION_COUNT) {
    throw new Error("Invalid upgrade proposal actions");
  }

  const decodedActions = decodeActions(actions);
  checkActions(decodedActions);

  const addresses = extractAddresses(decodedActions);
  const osxConfig = await generateOSxConfig(addresses.osx, network);
  const tokenVotingConfig = await generateTokenVotingConfig(
    addresses.tokenVoting,
    network,
  );
  const multisigConfig = await generateMultisigConfig(
    addresses.multisig,
    network,
  );
  const adminConfig = await generateAdminConfig(addresses.admin, network);

  console.log(
    JSON.stringify(
      {
        osx: osxConfig,
        tokenVoting: tokenVotingConfig,
        multisig: multisigConfig,
        admin: adminConfig,
      },
      null,
      2,
    ),
  );
}

function decodeActions(decodedActions: { decoded: string }[]) {
  // Process actions one by one (explicitly)
  return [
    // applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])
    decodeApplyMultiTargetPermissions(decodedActions[0].decoded),
    decodeApplyMultiTargetPermissions(decodedActions[1].decoded),

    // upgradeTo(address)
    decodeUpgradeTo(decodedActions[2].decoded),
    decodeUpgradeTo(decodedActions[3].decoded),

    // upgradeToAndCall(address,bytes)
    decodeUpgradeToAndCall(decodedActions[4].decoded),

    // createVersion(uint8,address,bytes,bytes)
    // NOTE: createVersion for admin is not present on ZkSync
    decodeCreateVersion(decodedActions[5].decoded),
    decodeCreateVersion(decodedActions[6].decoded),
  ] as const;
}

function checkActions(actions: ReturnType<typeof decodeActions>) {
  // applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])
  if (actions[0][0].operation !== "Grant") {
    throw new Error("Action 1 should grant");
  }
  if (actions[1][0].operation !== "Revoke") {
    throw new Error("Action 2.1 should Revoke");
  } else if (actions[1][1].operation !== "Grant") {
    throw new Error("Action 2.2 should grant");
  }

  // upgradeToAndCall(address,bytes)
  if (
    actions[4].data !==
    "0x42d8e99e00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
  ) {
    throw new Error("Incorrect upgradeToAndCall calldata");
  }

  // createVersion(uint8,address,bytes,bytes)
  // NOTE: createVersion for admin is not present on ZkSync
  if (actions[5].release !== "1")
    throw new Error("Incorrect release: " + actions[5].release);
  else if (actions[6].release !== "1")
    throw new Error("Incorrect release: " + actions[6].release);

  // NOTE: createVersion for admin is not present on ZkSync
  if (!actions[5].buildMetadata.startsWith("ipfs://"))
    throw new Error(
      "Incorrect build metadata link: " + actions[5].buildMetadata,
    );
  else if (!actions[6].buildMetadata.startsWith("ipfs://"))
    throw new Error(
      "Incorrect build metadata link: " + actions[6].buildMetadata,
    );

  // NOTE: createVersion for admin is not present on ZkSync
  if (!actions[5].releaseMetadata.startsWith("ipfs://"))
    throw new Error(
      "Incorrect release metadata link: " + actions[5].releaseMetadata,
    );
  else if (!actions[6].releaseMetadata.startsWith("ipfs://"))
    throw new Error(
      "Incorrect release metadata link: " + actions[6].releaseMetadata,
    );
}

function extractAddresses(actions: ReturnType<typeof decodeActions>) {
  const result = {
    osx: {} as Addresses,
    tokenVoting: {} as Addresses,
    multisig: {} as Addresses,
    admin: {} as Addresses,
  };

  let addr: string;

  // 1
  // Grant the REGISTER_DAO_PERMISSION_ID permission on the DAORegistry to the new DAOFactory
  addr = actions[0][0].who;
  result.osx[addr] = "DAOFactory";

  // 2
  // Moves the REGISTER_PLUGIN_REPO_PERMISSION_ID permission on the PluginRepoRegistry from the old PluginRepoFactory to the new PluginRepoFactory
  // addr = actions[1][1].where;
  // result.osx[addr] = "PluginRepoRegistry";
  addr = actions[1][1].who;
  result.osx[addr] = "PluginRepoFactory";

  // 3
  // Upgrade the DaoRegistry to the new implementation
  addr = actions[2].implementation;
  result.osx[addr] = "DAORegistry";

  // 4
  // Upgrade the PluginRepoRegistry to the new implementation
  addr = actions[3].implementation;
  result.osx[addr] = "PluginRepoRegistry";

  // 5
  // Upgrade the management DAO to the new implementation
  addr = actions[4].implementation;
  result.osx[addr] = "DAO";

  // NOTE: createVersion for admin is not present on ZkSync
  // result.admin[addr] = "AdminSetup";

  // 6
  // Publishes the AdminSetup
  addr = actions[5].pluginSetup;
  result.multisig[addr] = "MultisigSetup";

  // 7
  // Publishes the MultisigSetup
  addr = actions[6].pluginSetup;
  result.tokenVoting[addr] = "TokenVotingSetup";

  return result;
}

if (import.meta.main) {
  await main().catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
}
