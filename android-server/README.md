# Android Game Server (Kotlin)

This is a native Android application that serves as the WebSocket server for Tetris Battle. It allows you to host local multiplayer games directly from your Android phone without needing a dedicated PC server.
This is a native Android application that serves as the WebSocket server for Tetris Battle. It allows you to host local multiplayer games directly from your Android phone without needing a dedicated PC server.

## 🛠️ Building the Go Library
Before opening the Android project, you must build the Go shared library.

1.  **Install Gomobile:**
    ```bash
    go install golang.org/x/mobile/cmd/gomobile@latest
    gomobile init
    ```
2.  **Generate Frontend Assets:**
    ```bash
    cd client-nuxt
    npm run generate
    cd ..
    cp -R client-nuxt/.output/public/. public/
    ```
3.  **Build `.aar`:**
    ```bash
    # Ensure ANDROID_NDK_HOME is set
    gomobile bind -androidapi 24 -o android-server/app/libs/tetrisserver-lib-v1.1.4.aar -target=android .
    ```

    > **Tip:** You can use `./rebuild_and_run.sh` to quickly test changes on your Mac before building the AAR for Android.

## 🚀 Getting Started

### Prerequisites

*   **Android Studio:** Hedgehog (2023.1.1) or higher recommended.
*   **JDK:** Version 17 or higher.
*   **Android SDK:** Target SDK 34 (Android 14).

### Setup

1.  Open **Android Studio**.
2.  Select **Open** and navigate to the `android-server` directory.
3.  Allow Gradle to sync the project dependencies.
    *   *Note: This might take a few minutes for the first time.*
4.  Connect your Android device (ensure USB Debugging is enabled) or create an Android Emulator.
5.  Click the **Run** button (green play icon) in the toolbar.

## 📱 Features

*   **One-Tap Server:** Start and stop the WebSocket server with a single button.
*   **IP Address Display:** Automatically detects and displays your device's local IP address (e.g., `192.168.1.5:8080`) so clients can easily connect.
*   **Live Logs:** View real-time logs of server activity:
    *   Client connections/disconnections
    *   Match creation
    *   Game events (Pause, Game Over, etc.)
    *   **File Access Logging:** Shows every file requested by connected browsers (e.g., `[HTTP] GET /app.js`), useful for debugging.
*   **Background Service:** *(Ideally)* Runs in the foreground to prevent Android from killing the server process during a game.

## 🔧 Connectivity Guide

1.  **Start the Server** on your Android phone.
2.  Note the **IP Address** displayed (e.g., `192.168.1.45:8080`).
3.  **On the Client Device** (PC, another phone, tablet):
    *   Open the Tetris Battle Web App.
    *   Go to **Online Mode**.
    *   Enter the Server URL: `ws://192.168.1.45:8080/ws`
4.  Enjoy low-latency local multiplayer!

## 📦 Tech Stack

*   **Language:** Kotlin (UI) + Go (Logic)
*   **Server Core:** Go Standard Library (`net/http`) + `Gorilla WebSocket`
*   **Integration:** `Gomobile` (Compiled to `.aar`)
*   **Frontend:** Nuxt.js (Embedded in Go binary)
