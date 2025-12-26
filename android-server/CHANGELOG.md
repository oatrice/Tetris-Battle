# Changelog

All notable changes to the Android Server App project will be documented in this file.

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
