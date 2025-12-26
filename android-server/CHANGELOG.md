# Changelog

All notable changes to the Android Server App project will be documented in this file.

## [1.1.5] - 2025-12-26
### Fixed
*   **Mobile UI:** Fixed the "Exit" button being hidden on mobile devices by adding bottom padding and optimizing the game board layout.
*   **Touch Controls:** Enabled page scrolling when the game is paused or over, ensuring users can access bottom controls.

## [1.1.4] - 2025-12-26

### Fixed
*   **Android Crash:** Fixed `TypeError: crypto.randomUUID is not a function` by adding a polyfill in `LeaderboardService`.
*   **TypeScript:** Resolved multiple type mismatch errors in `app.vue` by removing unnecessary `reactive()` wrappers.

### Added
*   **Version Display:** Added library version (`lib-v1.1.4`) to the main menu for easier debugging.
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

### Added
- **Initial Release:** First stable version of the Android Game Server.
- **WebSocket Server:** Imolimented using `Java-WebSocket` running on port 8080.
- **Game Logic:**
  - `join_game`: Matchmaking logic supporting 1v1.
  - `game_start`: Broadcasting match details to players.
  - `game_over`, `attack`, `pause`, `resume`: Relaying game state events.
- **UI:**
  - Simple Dashboard with Start/Stop button.
  - Automatic Local IP detection and display.
  - Real-time scrollable log console.
