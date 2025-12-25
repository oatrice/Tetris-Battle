# Changelog

All notable changes to the Android Server App project will be documented in this file.

## [1.0.0] - 2025-12-25

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
