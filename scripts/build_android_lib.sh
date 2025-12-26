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
#   android-server/app/libs/tetrisserver-lib-v1.1.6.aar
# ==============================================================================

set -e

# Resolve Project Root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📂 Project Root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Version Configuration
VERSION="v1.1.6"
OUTPUT_AAR="android-server/app/libs/tetrisserver-lib-${VERSION}.aar"

echo "🍏 Building Nuxt Client..."
cd client-nuxt
npm run generate
cd ..

echo "🧹 Cleaning old assets..."
rm -rf public

echo "📦 Copying new assets..."
cp -r client-nuxt/.output/public public

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
