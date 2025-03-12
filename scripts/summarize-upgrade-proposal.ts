import {
  APPLY_MULTITARGET_PREFIX,
  CREATE_VERSION_PREFIX,
  UPGRADE_TO_AND_CALL_PREFIX,
  UPGRADE_TO_PREFIX,
  decodeApplyMultiTargetPermissions,
  decodeUpgradeTo,
  decodeUpgradeToAndCall,
  decodeCreateVersion,
} from "./lib.ts";

/*
Example input from data/upgrade-proposal-*-actions-decoded.json

[{
  "decoded": "1) \"applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])\"\n[(0, 0x96E54098317631641703404C06A5afAD89da7373, 0x9BC7f1dc3cFAD56a0EcD924D1f9e70f5C7aF0039, 0x0000000000000000000000000000000000000000, 0xde5e253d6956bc5fb69cfa564733633f4e53b143e42859306cd13cdc54856215)]"
}]
*/

const EXPECTED_ACTION_COUNT = 8;

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
}

function displaySummary(decodedActions: { decoded: string }[]) {
  console.log("\nUpgrade proposal actions:");
  for (const item of decodedActions) {
    if (item.decoded.startsWith(APPLY_MULTITARGET_PREFIX)) {
      console.log(
        "-------\napplyMultiTargetPermissions((uint8,address,address,address,bytes32)[])",
      );
      console.log(...decodeApplyMultiTargetPermissions(item.decoded));
    } else if (item.decoded.startsWith(UPGRADE_TO_PREFIX)) {
      console.log("-------\nupgradeTo(address)");
      console.log(decodeUpgradeTo(item.decoded));
    } else if (item.decoded.startsWith(UPGRADE_TO_AND_CALL_PREFIX)) {
      console.log("-------\nupgradeToAndCall(address,bytes)");
      console.log(decodeUpgradeToAndCall(item.decoded));
    } else if (item.decoded.startsWith(CREATE_VERSION_PREFIX)) {
      console.log("-------\ncreateVersion(uint8,address,bytes,bytes)");
      console.log(decodeCreateVersion(item.decoded));
    } else {
      throw new Error("Unrecognized action details: " + item.decoded);
    }
  }
}

if (import.meta.main) {
  await main();
}
