.DEFAULT_TARGET: help

# Import the .env files and export their values
include .env

SHELL:=/bin/bash

# Target dependent variables
deployment: export GENERATION_SCRIPT=generate-upgrade-deployment-config.ts
deployment-zk: export GENERATION_SCRIPT=generate-upgrade-deployment-config-zksync.ts

# TARGETS

.PHONY: help
help: ## Display the current message
	@echo "Available targets:"
	@cat Makefile | while IFS= read -r line; do \
	   if [[ "$$line" == "##" ]]; then \
			echo "" ; \
		elif [[ "$$line" =~ ^([^:]+):(.*)##\ (.*)$$ ]]; then \
			echo -e "- make $${BASH_REMATCH[1]}  \t$${BASH_REMATCH[3]}" ; \
		fi ; \
	done

##

.PHONY: init
init: .env ## Check the dependencies and prepare the environment
	@mkdir -p data deployments
	@which docker > /dev/null || (echo "Error: Docker is not installed" ; exit 1)
	@which jq > /dev/null || (echo "Error: jq is not installed" ; exit 1)
	@which cast > /dev/null || (echo "Error: Foundry is not installed" ; exit 1)
	docker pull denoland/deno:alpine

.PHONY: clean
clean: ## Clean the generated artifacts
	rm -Rf ./data/*

##

# Entry points

.PHONY: deployment
deployment: deployments/osx-$(network).json  ## Generate the config to verify with diffyscan-workspace

.PHONY: deployment-zk
deployment-zk: deployments/osx-$(network).json  ## Generate the config to verify with diffyscan-workspace (only ZkSync)

.PHONY: summary
summary: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json  ## Show the decoded proposal upgrade actions
	docker run --rm \
    	-v ./scripts/summarize-upgrade-proposal.ts:/root/script.ts:ro \
    	-v ./scripts/lib.ts:/root/lib.ts:ro \
    	-v ./$<:/root/data.json:ro \
    	denoland/deno:alpine \
    	deno run --allow-read /root/script.ts /root/data.json

# Internal targets

# Deployment config <= Decoded proposal actions
deployments/osx-$(network).json: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json
	@echo "Generating the deployment config file"
	docker run --rm \
    	-v ./scripts/$(GENERATION_SCRIPT):/root/script.ts:ro \
    	-v ./scripts/lib.ts:/root/lib.ts:ro \
    	-v ./scripts/template-osx.json:/root/template-osx.json:ro \
    	-v ./scripts/template-token-voting.json:/root/template-token-voting.json:ro \
    	-v ./scripts/template-multisig.json:/root/template-multisig.json:ro \
    	-v ./scripts/template-admin.json:/root/template-admin.json:ro \
    	-v ./$<:/root/data.json:ro \
        -w /root \
    	denoland/deno:alpine \
    	deno run --allow-read /root/script.ts /root/data.json $(network) > ./deployments/all-$(network).json

	jq ".osx" ./deployments/all-$(network).json > $(@)
	jq ".tokenVoting" ./deployments/all-$(network).json > deployments/token-voting-$(network).json
	jq ".multisig" ./deployments/all-$(network).json > deployments/multisig-$(network).json
	jq ".admin" ./deployments/all-$(network).json > deployments/admin-$(network).json

	rm ./deployments/all-$(network).json

# Decoded proposal actions <= Proposal raw actions
data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions.json
	@echo "Decoding action parameters"
	jq -r '.[] | "cast 4byte-decode \(.data)"' $< | while read cmd; do \
	  data=$$(eval "$$cmd") ; \
	  jq -n --arg data "$$data" '{"decoded": $$ARGS.named.data}' ; \
	done | jq -s '.' > $(@)

# Proposal raw actions <= Proposal raw data
data/upgrade-proposal-$(network)-$(address)-$(pid)-actions.json: data/upgrade-proposal-$(network)-$(address)-$(pid)-raw.json
	@echo "Parsing proposal actions"
	docker run --rm \
        -v ./scripts/parse-upgrade-proposal-actions.ts:/root/script.ts:ro \
        -v ./$<:/root/data.json:ro \
        denoland/deno:alpine \
        deno run --allow-read /root/script.ts /root/data.json > $(@)

# Fetch proposal data
data/upgrade-proposal-$(network)-$(address)-$(pid)-raw.json:
	@if [ -z "$(address)" ]; then echo "Please, append 'address=<plugin-address>'"; exit 1 ; fi
	@if [ -z "$(pid)" ]; then echo "Please, append 'pid=<proposal-id>'"; exit 1 ; fi
	@if [ -z "$(network)" ]; then echo "Please, append 'network=<name>'"; exit 1 ; fi
	@if [ -z "$(JSON_RPC_URL)" ]; then echo "Please, define 'JSON_RPC_URL' on .env"; exit 1 ; fi

	@echo "Fetching proposal into $(@)"
	CALLDATA=$$(cast call $(address) "getProposal(uint256)" --rpc-url $(JSON_RPC_URL) $(pid)) && \
	   cast decode-abi --json "getProposal(uint256)(bool,uint16,tuple(uint16,uint64,uint64,uint64),tuple(address,uint256,bytes)[],uint256)" $$CALLDATA > $(@)
