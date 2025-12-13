#!/bin/bash

# --- Configuration ---
BUILD_DIR="build"

# --- Check for Clean Build ---
if [[ "$1" == "clean" || "$1" == "--clean" ]]; then
    echo "🧹 Cleaning up old build files..."
    rm -rf "$BUILD_DIR"
fi

# --- Build ---
mkdir -p $BUILD_DIR
cd $BUILD_DIR

echo "⚙️  Configuring..."
# Run CMake if Makefile doesn't exist or if we just cleaned
if [ ! -f "Makefile" ]; then
    cmake .. -DCMAKE_POLICY_VERSION_MINIMUM=3.5
fi

echo "🔨 Compiling..."
make TetrisClient
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# --- Run ---
echo "🚀 Starting TetrisClient..."
./TetrisClient
