OSX Upgrade Workspace
---

A set of tools to verify OSx protocol upgrade proposals, as well as generating the config files for DiffyScan workspace deployments.

## Get started

```
$ make
Available targets:
- make help 		Display the current message

- make init 		Check the dependencies and prepare the environment
- make clean 		Clean the generated artifacts

- make deployment 		Generate the deployment to verify with diffyscan-workspace
- make summary 		    Generate the deployment to verify with diffyscan-workspace
```


Run `make init` to set the environment.

Copy `.env.example` into `.env` and define `JSON_RPC_URL`.

Run `make deployment address=<multisig-plugin-addr> pid=<proposal-id> network=<name>`
