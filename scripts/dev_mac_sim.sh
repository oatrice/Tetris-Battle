#!/bin/bash

# ==============================================================================
# 🍎 Tetris Battle - Local Mac Simulation Runner
# ==============================================================================
# Usage: ./scripts/dev_mac_sim.sh (or via 'make dev')
#
# Purpose:
#   1. Rebuilds the Nuxt.js Client (Static Generation)
#   2. Copies assets to the Go server's 'public' directory
#   3. Runs the Go server in Mac Simulation mode (cmd/mac-sim)
# ==============================================================================

set -e

# Resolve Project Root (One level up from this script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 Project Root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "🍏 Building Nuxt Client..."
cd client-nuxt
npm run generate
cd ..

echo "🧹 Cleaning old assets..."
rm -rf public

echo "📦 Copying new assets..."
cp -r client-nuxt/.output/public public

echo "📝 Generating public/version.json..."
FRONTEND_VERSION=$(grep '"version":' client-nuxt/package.json | head -n 1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
GIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "{\"version\": \"$FRONTEND_VERSION\", \"hash\": \"$GIT_HASH\", \"timestamp\": \"$TIMESTAMP\"}" > public/version.json


echo "🍎 Starting Mac Simulation..."
go run cmd/mac-sim/main.go
