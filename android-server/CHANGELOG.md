# Changelog

All notable changes to the Android Server App project will be documented in this file.

## [1.3.0] - 2026-01-01

### Added
- **Background Service:** Server now runs as a foreground service, allowing it to continue operating even when the app is in the background or the screen is off.
- **Notification Control:** Added a persistent notification with a "Stop Server" action for quick control.
- **Log Improvement:** Added auto-scroll functionality to the log view.
- **Detailed Versioning:** Server now displays the Frontend version, Git Hash, and Timestamp alongside the Library version (e.g., `lib-v1.2.0-3.16.0-hash-timestamp`).

### Changed
- **Build Process:** Updated build scripts to automatically generate `version.json` and embed it into the Android Library.
- **File Naming:** Generated AAR files now include both library and client versions in their filenames.

## [1.2.0] - 2025-12-28

### Added
- **'Allow Hold Piece' Game Setting:** Introduced a new game setting that allows players to enable or disable the hold piece feature. This setting is now configurable by the host and synchronized to guests.
- **Enhanced Game Settings Synchronization:** All game settings (attack mode, ghost piece visibility, effect type, cascade gravity, hold piece, and gravity increase) are now consistently synchronized between the host and guests.

### Fixed
- **Version Mismatch:** Addressed an issue where the server version might not be correctly reported, ensuring accurate versioning for the Go library.

### Changed
- **Log Verbosity:** Increased the detail in server logs to include all relevant game settings when a client joins or a host sets up a room.
- **LAN Connection Headers:** Added `Access-Control-Allow-Methods` and `Access-Control-Allow-Private-Network` headers to the version endpoint to improve compatibility with local network connections and development environments.

### Note
- The `CHANGELOG.md` in `android-server/` has been updated to reflect the new version `1.1.7` for the Android library, which includes the `increaseGravity` setting synchronization and other improvements. This is a precursor to the `1.2.0` release of the Go server.

## [1.1.7] - 2025-12-27

### Added
- **Gravity Setting Sync:** Server now broadcasts `increaseGravity` setting from host to guest via `room_status`.
- **LAN Game Settings Sync:** Host settings (attack mode, gravity) are now synchronized to guests upon joining.

### Fixed
- **Guest Host Role:** Fixed `isHost` logic to correctly identify guest clients.
- **Game Over Broadcast:** Improved `game_over` event handling to correctly determine winner/loser/draw states.

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
