OSX Upgrade Workspace
---

A set of tools to verify OSx protocol upgrade proposals, as well as generating the config files for DiffyScan workspace deployments.

## Get started

```
$ make
Available targets:
- make help     Display the current message

- make init    	Check the dependencies and prepare the environment
- make clean    Clean the generated artifacts

- make deployment   Generate the deployment to verify with diffyscan-workspace
- make summary      Show the decoded proposal upgrade actions
```


Run `make init` to set the environment.

Copy `.env.example` into `.env` and define `JSON_RPC_URL`.

## Config file generation

To generate the deployment configuration given a Management DAO upgrade proposal:

```sh
$ make deployment address=<multisig-plugin-addr> pid=<proposal-id> network=<name>
```

Where:
- `multisig-plugin-addr` is the address of the DAO's multisig plugin
- `proposal-id` is the ID of the proposal created on that network
- `name` is the the name of the target network (example: `polygon`)

Check the `deployments` folder:

```sh
$ ls deployments/
admin-polygon.json         osx-polygon.json
multisig-polygon.json      token-voting-polygon.json
```

## Summarya generation

To show a summary of a given a Management DAO upgrade proposal:

```sh
$ make summary address=<multisig-plugin-addr> pid=<proposal-id> network=<name>
```

This should output something like:

```
Upgrade proposal actions:
-------
applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])
{
  operation: "Grant",
  where: "0x96E54098317631641703404C06A5afAD89da7373",
  who: "0x9BC7f1dc3cFAD56a0EcD924D1f9e70f5C7aF0039",
  condition: "0x0000000000000000000000000000000000000000",
  permissionId: "0xde5e253d6956bc5fb69cfa564733633f4e53b143e42859306cd13cdc54856215"
}
-------
applyMultiTargetPermissions((uint8,address,address,address,bytes32)[])
{
  operation: "Revoke",
  where: "0xA03C2182af8eC460D498108C92E8638a580b94d4",
  who: "0x868581Ee5991C6C08D2467132698fa4AB6C9c272",
  condition: "0x0000000000000000000000000000000000000000",
  permissionId: "0x055973dfb6d3b3cd890dde3a801f5427fa973864752b6d2a1ae61cbd5ae5dc09"
} {
  operation: "Grant",
  where: "0xA03C2182af8eC460D498108C92E8638a580b94d4",
  who: "0xdD9a458088B24ed90a4BfacD16e761b01Bb56FB3",
  condition: "0x0000000000000000000000000000000000000000",
  permissionId: "0x055973dfb6d3b3cd890dde3a801f5427fa973864752b6d2a1ae61cbd5ae5dc09"
}
-------
upgradeTo(address)
{ implementation: "0xF85b3323268431672a035E54b4DD05a5c6ee6D18" }
-------
upgradeTo(address)
{ implementation: "0x3ef9965BEC1D2222aee22D30b4f870fEB05c2Ee1" }
-------
upgradeToAndCall(address,bytes)
{
  implementation: "0xDC5E714720797Fa0B453Bc9eF5049548C79031C3",
  data: "0x42d8e99e00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
}
-------
createVersion(uint8,address,bytes,bytes)
{
  release: "1",
  pluginSetup: "0xd0ee1326894Bdd3ded3dEbCBd757C3A796f21190",
  buildMetadata: "ipfs://bafkreifijshftf47q5mtoibfvwkzv42reqf4uddi46i7kcblt6bpsvgii4",
  releaseMetadata: "ipfs://bafkreifbwooo3h36htzscftwm3kouoktcvkqyhaxluodo6xkyprnon3r54"
}
-------
createVersion(uint8,address,bytes,bytes)
{
  release: "1",
  pluginSetup: "0xFe090A3E8A4d490e29FFe3c99e35DC64DA99402B",
  buildMetadata: "ipfs://bafkreiaipjj2ryy2ui77crwmgbamjkmr6xbdvrviylh4z4kf54sq2etvgu",
  releaseMetadata: "ipfs://bafkreiesxfvwf7qphbpw2epmabrrz2alwo66fso7tjx3cbt63k4xzec3ma"
}
-------
createVersion(uint8,address,bytes,bytes)
{
  release: "1",
  pluginSetup: "0x80dF8908Ef80E9bf83676BAc05dE6DFCFe7EDe70",
  buildMetadata: "ipfs://bafkreifsn2562ftambmmfoqa64wfxviu4g47evmcj5ydsjdmmsmqhqrn3i",
  releaseMetadata: "ipfs://bafkreidwa5z5vi2o43msjwfinxapf3zfpshapdaw6kksdz52sffb4p4oqi"
}

```
