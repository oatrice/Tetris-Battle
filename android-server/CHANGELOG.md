# Changelog

All notable changes to the Android Server App project will be documented in this file.

## [1.1.6] - 2025-12-27

### Added
- **Workflow:**
    - Added an Android version update workflow for easier deployment.
    - Added an automated version bumping script to streamline releases.

## [1.1.4] - 2025-12-26

### Added
*   **Tests:** Added `TestServerParity` to ensure Go server serves Nuxt assets correctly.

## [1.1.3] - 2025-12-26

### Fixed
*   **Mac Simulation:** Fixed compilation error in `cmd/mac-sim` helper.
*   **Asset Bundling:** Resolved missing `_nuxt` assets by performing a clean build before binding.

## [1.1.2] - 2025-12-26

### Added
*   **Client Logging Bridge:** The Web Client now sends logs (like "User started Solo Mode") to the Android Server logs for easier debugging.
*   **Debug Endpoint:** Added `POST /debug/log` to receive client logs.

## [1.1.1] - 2025-12-26

### Fixed
*   **Asset Loading:** Fixed `404` errors for embedded Nuxt.js assets by correctly embedding hidden directories (`_nuxt`).
*   **MIME Types:** Fixed MIME type rejection on Android by explicitly setting headers for `.css` and `.js` files.

## [1.1.0] - 2025-12-26

### 🚀 Architecture Overhaul (Gomobile)
*   **Native Go Library:** Replaced the legacy `Java-WebSocket` implementation with a full Go server compiled as an Android Library (`tetrisserver.aar`).
*   **Embedded Frontend:** The Android App now hosts the full Nuxt.js web client! Connect to `http://<PHONE_IP>:8080` to play.
*   **Shared Logic:** Game logic is now 100% identical to the PC server (single source of truth).

### Added
*   **File Access Logging:** The live log now shows real-time HTTP requests from connected browsers (e.g., `[HTTP] GET /app.js`).
*   **Version Display:** Added version number indication on startup.

## [1.0.0] - Initial Release

### Added
- **Initial Release:** First stable version of the Android Game Server.
- **WebSocket Server:** Implemented using `Java-WebSocket` running on port 8080.
- **Game Logic:**
  - `join_game`: Matchmaking logic supporting 1v1.
  - `game_start`: Broadcasting match details to players.
  - `game_over`, `attack`, `pause`, `resume`: Relaying game state events.
- **UI:**
  - Simple Dashboard with Start/Stop button.
  - Automatic Local IP detection and display.
  - Real-time scrollable log console.
