#!/bin/bash

# ==============================================================================
# 🍎 Tetris Battle - Local Mac Simulation Runner
# ==============================================================================
# Usage: ./rebuild_and_run.sh
#
# Purpose:
#   1. Rebuilds the Nuxt.js Client (Static Generation)
#   2. Copies assets to the Go server's 'public' directory
#   3. Runs the Go server in Mac Simulation mode (cmd/mac-sim)
#
# Use this script when:
#   - You changed frontend code and want to test it locally on Mac.
#   - You want to verify Go <-> Nuxt integration without an Android device.
# ==============================================================================

set -e

echo "🍏 Building Nuxt Client..."
cd client-nuxt
npm run generate
cd ..

echo "🧹 Cleaning old assets..."
rm -rf public

echo "📦 Copying new assets..."
cp -r client-nuxt/.output/public public

echo "🍎 Starting Mac Simulation..."
go run cmd/mac-sim/main.go
