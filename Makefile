# Tetris Battle - Development Makefile

.PHONY: help dev build-android test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Run Mac Simulation (Rebuild Client + Go Server)
	@./scripts/dev_mac_sim.sh

build-android: ## Build Android Library (.aar)
	@./scripts/build_android_lib.sh

test: ## Run all tests (Go + Nuxt)
	@echo "🧪 Running Go Tests..."
	@go test -v .
	@echo "🧪 Running Nuxt Tests..."
	@cd client-nuxt && npm run test
