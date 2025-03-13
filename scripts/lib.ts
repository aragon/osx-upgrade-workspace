export type Addresses = { [k: string]: string };

const OSX_CONFIG_TEMPLATE = "template-osx.json";
const TOKEN_VOTING_CONFIG_TEMPLATE = "template-token-voting.json";
const MULTISIG_CONFIG_TEMPLATE = "template-multisig.json";
const ADMIN_CONFIG_TEMPLATE = "template-admin.json";

const APPLY_MULTITARGET_PREFIX =
  '1) \"applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])\"\n';
const UPGRADE_TO_PREFIX = '1) \"upgradeTo(address)\"\n';
const UPGRADE_TO_AND_CALL_PREFIX = '1) \"upgradeToAndCall(address,bytes)\"\n';
const CREATE_VERSION_PREFIX =
  '1) \"createVersion(uint8,address,bytes,bytes)\"\n';

// ABI DECODING

export function decodeApplyMultiTargetPermissions(data: string) {
  if (!data.startsWith(APPLY_MULTITARGET_PREFIX)) {
    throw new Error("Invalid signature for applyMultiTargetPermissions");
  }

  const params = data.replace(APPLY_MULTITARGET_PREFIX, "").split("\n");
  if (params.length !== 1) {
    throw new Error("Invalid applyMultiTargetPermissions param count");
  }

  const targets = params[0].slice(2, -2).split("), (");

  const result: {
    operation: string;
    where: string;
    who: string;
    condition: string;
    permissionId: string;
  }[] = [];

  // (uint8,address,address,address,bytes32)[]
  for (let target of targets) {
    target = target.replace(/^\(/, "").replace(/\)$/, "");
    const params = target.split(", ");

    if (params.length !== 5) {
      throw new Error("Invalid applyMultiTargetPermissions item count");
    }
    result.push({
      operation:
        params[0] === "0"
          ? "Grant"
          : params[0] === "1"
            ? "Revoke"
            : "GrantWithCondition",
      where: params[1],
      who: params[2],
      condition: params[3],
      permissionId: params[4],
    });
  }
  return result;
}

export function decodeUpgradeTo(data: string) {
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

export function decodeUpgradeToAndCall(data: string) {
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

export function decodeCreateVersion(data: string) {
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
    buildMetadata: hexToString(params[2]),
    releaseMetadata: hexToString(params[3]),
  };
}

// CONFIG

export async function generateOSxConfig(addresses: Addresses, network: string) {
  const strTemplate = await readTemplate(OSX_CONFIG_TEMPLATE, network);
  const template = JSON.parse(strTemplate);

  Object.assign(template, { contracts: addresses });
  return template;
}

export async function generateTokenVotingConfig(
  addresses: Addresses,
  network: string,
) {
  const strTemplate = await readTemplate(TOKEN_VOTING_CONFIG_TEMPLATE, network);
  const template = JSON.parse(strTemplate);

  Object.assign(template, { contracts: addresses });
  return template;
}

export async function generateMultisigConfig(
  addresses: Addresses,
  network: string,
) {
  const strTemplate = await readTemplate(MULTISIG_CONFIG_TEMPLATE, network);
  const template = JSON.parse(strTemplate);

  Object.assign(template, { contracts: addresses });
  return template;
}

export async function generateAdminConfig(
  addresses: Addresses,
  network: string,
) {
  const strTemplate = await readTemplate(ADMIN_CONFIG_TEMPLATE, network);
  const template = JSON.parse(strTemplate);

  Object.assign(template, { contracts: addresses });
  return template;
}

export async function readTemplate(
  path: string,
  network: string,
): Promise<string> {
  const strTemplate = await Deno.readTextFile(path);
  return strTemplate.replaceAll(/\<NETWORK\>/g, network);
}

// Helpers

function hexToString(hex: string): string {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2); // Remove "0x" prefix if present
  }

  if (hex.length % 2 !== 0) {
    throw new Error(
      "Invalid hex string: must have an even number of characters",
    );
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error(
        "Invalid hex string: contains non-hexadecimal characters",
      );
    }
    bytes[i / 2] = byte;
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
