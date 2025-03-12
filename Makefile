.DEFAULT_TARGET: help

# Import the .env files and export their values
include .env

SHELL:=/bin/bash
validate_deployment = $(if $(findstring $(1),$(AVAILABLE_DEPLOYMENTS)),,$(error "Invalid deployment target: $(1). The allowed deployment targets are: $(AVAILABLE_DEPLOYMENTS)"))
ensure_file = $(if $(wildcard $(1)),,$(error "Required file not found: $(1)"))
DIFFYSCAN_PARAMS_FILE = diffyscan-params.json


# TARGETS

.PHONY: help
help: ## Display the current message
	@echo "Available targets:"
	@cat Makefile | while IFS= read -r line; do \
	   if [[ "$$line" == "##" ]]; then \
			echo "" ; \
		elif [[ "$$line" =~ ^([^:]+):(.*)##\ (.*)$$ ]]; then \
			echo -e "- make $${BASH_REMATCH[1]}    \t$${BASH_REMATCH[3]}" ; \
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

.PHONY: deployment
deployment: deployments/osx-$(network).json  ## Generate the deployment to verify with diffyscan-workspace

.PHONY: summary
summary: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json  ## Show the decoded proposal upgrade actions
	docker run --rm \
    	-v ./scripts/summarize-upgrade-proposal.ts:/root/script.ts:ro \
    	-v ./scripts/lib.ts:/root/lib.ts:ro \
    	-v ./$<:/root/data.json:ro \
    	denoland/deno:alpine \
    	deno run --allow-read /root/script.ts /root/data.json

# Actions => deployment config
deployments/osx-$(network).json: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json
	@echo "Generating the deployment config file"
	docker run --rm \
    	-v ./scripts/generate-upgrade-deployment-config.ts:/root/script.ts:ro \
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

data/upgrade-proposal-$(network)-$(address)-$(pid)-actions-decoded.json: data/upgrade-proposal-$(network)-$(address)-$(pid)-actions.json
	@echo "Decoding action parameters"
	jq -r '.[] | "cast 4byte-decode \(.data)"' $< | while read cmd; do \
	  data=$$(eval "$$cmd") ; \
	  jq -n --arg data "$$data" '{"decoded": $$ARGS.named.data}' ; \
	done | jq -s '.' > $(@)

# Proposal data => Actions
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
	CALLDATA=$$(cast call $(address) "getProposal(uint256)" --rpc-url "$(JSON_RPC_URL)" 4) && \
	   cast decode-abi --json "getProposal(uint256)(bool,uint16,tuple(uint16,uint64,uint64,uint64),tuple(address,uint256,bytes)[],uint256)" $$CALLDATA > $(@)
