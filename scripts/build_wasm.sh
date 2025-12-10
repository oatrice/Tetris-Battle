#!/bin/bash
# Check for emcmake
if ! command -v emcmake &> /dev/null
then
    echo "❌ emcmake could not be found!"
    echo "👉 Please install Emscripten SDK and activate it first."
    echo "   See: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Clean previous build to force re-configure
rm -rf client/build-web

mkdir -p client/build-web
cd client/build-web

echo "⚙️ Configuring via Emscripten..."
emcmake cmake .. -DPLATFORM=Web -DCMAKE_BUILD_TYPE=Release -DCMAKE_POLICY_VERSION_MINIMUM=3.5

echo "🔨 Building..."
emmake make

echo "✅ Build Complete! To run locally:"
echo "   python3 -m http.server 8000"
echo "   Then open http://localhost:8000/TetrisClient.html"
