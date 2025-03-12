#!/usr/bin/env -S deno run

/*
Example input from data/upgrade-proposal-*-actions-decoded.json

[{
  "decoded": "1) \"applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])\"\n[(0, 0x96E54098317631641703404C06A5afAD89da7373, 0x9BC7f1dc3cFAD56a0EcD924D1f9e70f5C7aF0039, 0x0000000000000000000000000000000000000000, 0xde5e253d6956bc5fb69cfa564733633f4e53b143e42859306cd13cdc54856215)]"
}]
*/

const EXPECTED_ACTION_COUNT = 8;
const APPLY_MULTITARGET_PREFIX =
  '1) \"applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])\"\n';
const UPGRADE_TO_PREFIX = '1) \"upgradeTo(address)\"\n';
const UPGRADE_TO_AND_CALL_PREFIX = '1) \"upgradeToAndCall(address,bytes)\"\n';
const CREATE_VERSION_PREFIX =
  '1) \"createVersion(uint8,address,bytes,bytes)\"\n';

async function main() {
  if (Deno.args.length !== 1) {
    console.error("Usage: deno run script.ts <file>.json");
    Deno.exit(1);
  }

  const filename = Deno.args[0];
  let fileContent: string;

  try {
    fileContent = await Deno.readTextFile(filename);
  } catch (error) {
    console.error(`Error reading file "${filename}": ${error.message}`);
    Deno.exit(1);
  }

  const decodedActions = JSON.parse(fileContent!);
  if (
    !Array.isArray(decodedActions) ||
    decodedActions.length !== EXPECTED_ACTION_COUNT
  ) {
    throw new Error("Invalid upgrade proposal actions");
  }

  displaySummary(decodedActions);

  // console.log(JSON.stringify(config, null, 2));
}

function decodeApplyMultiTargetPermissions(data: string) {
  if (!data.startsWith(APPLY_MULTITARGET_PREFIX)) {
    throw new Error("Invalid signature for applyMultiTargetPermissions");
  }

  const params = data.replace(APPLY_MULTITARGET_PREFIX, "").split("\n");
  if (params.length !== 1) {
    throw new Error("Invalid applyMultiTargetPermissions param count");
  }

  // (uint8,address,address,address,bytes32)[]
  const items = params[0].slice(1, -1).split(", ");
  if (items.length !== 5) {
    console.error("PARAMS", items);
    throw new Error("Invalid applyMultiTargetPermissions item count");
  }
  return {
    operation: items[0],
    where: items[1],
    to: items[2],
    condition: items[3],
    permissionId: items[4],
  };
}

function decodeUpgradeTo(data: string) {
  if (!data.startsWith(UPGRADE_TO_PREFIX)) {
    throw new Error("Invalid signature for upgradeTo");
  }

  const params = data.replace(UPGRADE_TO_PREFIX, "").split("\n");
  if (params.length !== 1) {
    throw new Error("Invalid upgradeTo param count");
  }

  // (address)
  return {
    implementation: params[0],
  };
}

function decodeUpgradeToAndCall(data: string) {
  if (!data.startsWith(UPGRADE_TO_AND_CALL_PREFIX)) {
    throw new Error("Invalid signature for upgradeToAndCall");
  }

  const params = data.replace(UPGRADE_TO_AND_CALL_PREFIX, "").split("\n");
  if (params.length !== 2) {
    throw new Error("Invalid upgradeToAndCall param count");
  }

  // (address,bytes)
  return {
    implementation: params[0],
    data: params[1],
  };
}

function decodeCreateVersion(data: string) {
  if (!data.startsWith(CREATE_VERSION_PREFIX)) {
    throw new Error("Invalid signature for createVersion");
  }

  const params = data.replace(CREATE_VERSION_PREFIX, "").split("\n");
  if (params.length !== 4) {
    throw new Error("Invalid createVersion param count");
  }

  // (uint8,address,bytes,bytes)
  return {
    release: params[0],
    pluginSetup: params[1],
    buildMetadata: params[2],
    releaseMetadata: params[3],
  };
}

function displaySummary(decodedActions: { decoded: string }[]) {
  console.log("Upgrade proposal actions:");
  for (const item of decodedActions) {
    if (item.decoded.startsWith(APPLY_MULTITARGET_PREFIX)) {
      console.log(decodeApplyMultiTargetPermissions(item.decoded));
    } else if (item.decoded.startsWith(UPGRADE_TO_PREFIX)) {
      console.log(decodeUpgradeTo(item.decoded));
    } else if (item.decoded.startsWith(UPGRADE_TO_AND_CALL_PREFIX)) {
      console.log(decodeUpgradeToAndCall(item.decoded));
    } else if (item.decoded.startsWith(CREATE_VERSION_PREFIX)) {
      console.log(decodeCreateVersion(item.decoded));
    } else {
      throw new Error("Unrecognized action details: " + item.decoded);
    }
  }
}

if (import.meta.main) {
  await main();
}
