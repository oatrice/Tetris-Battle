#!/bin/bash

# --- Configuration ---
BUILD_DIR="build-web"
WEBSOCKIFY_PORT="12346"
GAME_PORT="12345"
HTTP_PORT="8000"

# --- Check for Clean Build ---
if [[ "$1" == "clean" || "$1" == "--clean" ]]; then
    echo "🧹 Cleaning up old build files..."
    rm -rf "$BUILD_DIR"
fi

# --- 1. Detect Local IP ---
echo "🔍 Detecting Local IP..."
# Try getting IP from en0 (WiFi usually)
LOCAL_IP=$(ipconfig getifaddr en0)

if [ -z "$LOCAL_IP" ]; then
    # Fallback attempt if en0 is empty
    LOCAL_IP=$(ipconfig getifaddr en1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  Could not detect valid WiFi IP. Defaulting to 127.0.0.1"
    LOCAL_IP="127.0.0.1"
else
    echo "✅ Local IP detected: $LOCAL_IP"
fi

# --- 2. Build for Web (Injecting IP) ---
echo "🏗️  Building Web Client with Default Host IP: $LOCAL_IP"

mkdir -p $BUILD_DIR
cd $BUILD_DIR

# Run CMake with the detected IP
emcmake cmake .. -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DHOST_IP="$LOCAL_IP" -DPLATFORM=Web > /dev/null

# Compile
emmake make
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

cd ..
echo "✅ Build successful!"

# --- 3. Start Websockify ---
echo "🔄 Starting Websockify to proxy $WEBSOCKIFY_PORT -> $LOCAL_IP:$GAME_PORT"
# Kill existing websockify if any (be careful not to kill system processes, strictly match python module)
pkill -f "websockify $WEBSOCKIFY_PORT"

# Run websockify in background
python3 -m websockify $WEBSOCKIFY_PORT $LOCAL_IP:$GAME_PORT &
WEBSOCKIFY_PID=$!
echo "   (PID: $WEBSOCKIFY_PID)"

# --- 4. Start HTTP Server ---
echo "🌐 Starting HTTP Server on port $HTTP_PORT"
# Run http.server in background
cd $BUILD_DIR
python3 -m http.server $HTTP_PORT &
HTTP_PID=$!
echo "   (PID: $HTTP_PID)"

# --- 5. Instructions ---
echo ""
echo "========================================================"
echo "🚀 Web Client is Running!"
echo "   Open on Mobile: http://$LOCAL_IP:$HTTP_PORT/TetrisClient.html"
echo "   Default Join IP: $LOCAL_IP"
echo "========================================================"
echo "🛑 Press Ctrl+C to stop servers."

# --- Cleanup Trap ---
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $WEBSOCKIFY_PID
    kill $HTTP_PID
    exit 0
}
trap cleanup SIGINT

# Keep script running to maintain background processes
wait
