#!/bin/bash

# ==============================================================================
# 🤖 Tetris Battle - Android Library Builder
# ==============================================================================
# Usage: ./scripts/build_android_lib.sh (or via 'make build-android')
#
# Purpose:
#   1. Rebuilds the Nuxt.js Client (Static Generation)
#   2. Copies assets to the Go server's 'public' directory
#   3. Compiles the Go code into an Android Library (.aar) using Gomobile
#
# Output:
#   android-server/app/libs/tetrisserver-lib-v1.3.0.aar
# ==============================================================================

set -e

# Resolve Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 Project Root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Version Configuration
# Version Configuration
echo "🔍 extracting version from client-nuxt/package.json..."
FRONTEND_VERSION=$(grep '"version":' client-nuxt/package.json | head -n 1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')
LIB_VERSION="v1.3.0"
GIT_HASH=$(git rev-parse --short HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

VERSION="${LIB_VERSION}-client-v${FRONTEND_VERSION}"
OUTPUT_AAR="android-server/app/libs/tetrisserver-lib-${VERSION}.aar"

echo "🍏 Building Nuxt Client..."
cd client-nuxt
npm run generate
cd ..

echo "🧹 Cleaning old assets..."
rm -rf public
# Clean old libs to avoid confusion
rm -f android-server/app/libs/tetrisserver-lib-*.aar

echo "📦 Copying new assets..."
cp -r client-nuxt/.output/public public

echo "📝 Generating public/version.json..."
echo "{\"version\": \"$FRONTEND_VERSION\", \"hash\": \"$GIT_HASH\", \"timestamp\": \"$TIMESTAMP\"}" > public/version.json

echo "🤖 Building Android Library (${VERSION})..."

# Add Go bin to PATH to find gomobile
export PATH=$PATH:$(go env GOPATH)/bin

# Check for ANDROID_NDK_HOME
if [ -z "$ANDROID_NDK_HOME" ]; then
    echo "⚠️  WARNING: ANDROID_NDK_HOME is not set."
    echo "   Attempting to detect standard macOS location..."
    export ANDROID_NDK_HOME=$HOME/Library/Android/sdk/ndk/$(ls -1 $HOME/Library/Android/sdk/ndk | sort -V | tail -n 1)
    
    if [ -d "$ANDROID_NDK_HOME" ]; then
        echo "   ✅ Detected NDK at: $ANDROID_NDK_HOME"
    else
        echo "   ❌ Could not auto-detect NDK. Build will likely fail."
        echo "   Please run: export ANDROID_NDK_HOME=/path/to/android/ndk"
    fi
fi

gomobile bind -androidapi 24 -o "$OUTPUT_AAR" -target=android .

echo "✅ Build Complete!"
echo "📍 Output: $OUTPUT_AAR"
echo "👉 Now open 'android-server' in Android Studio and Sync Gradle."
