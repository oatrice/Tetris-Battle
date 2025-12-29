# Changelog

## [3.17.0] - 2025-12-29

### Added
- **Global Leaderboard Source Switcher**: Users can now select between "Local" and "Global" sources for the leaderboard.
    - "Local" leaderboard displays scores from the current user's device.
    - "Global" leaderboard displays scores from all users (requires Firebase authentication).
- **Firebase Integration for Global Leaderboard**: Implemented Firebase for storing and retrieving global leaderboard scores.
- **User Authentication Prompt**: Users will be prompted to sign in with Firebase if they wish to submit scores to the global leaderboard.

### Changed
- **Leaderboard Component Refactor**: The `Leaderboard.vue` component has been refactored to accommodate the new global source switching functionality.
- **Firebase Service Update**: `LeaderboardService.ts` and `LeaderboardService.firebase.ts` have been updated to handle both local and global leaderboard data.
- **Game Component Updates**: `DuoGame.vue` and `OnlineGame.vue` now correctly interact with the updated leaderboard service.

### Fixed
- **Leaderboard Data Fetching**: Ensured accurate fetching and display of scores from both local and global sources.

## [3.16.0] - 2025-12-29

### Added
- **Game State Persistence (Solo & Special)**:
    - **Auto-Save on Pause**: Game state is now automatically saved to local storage when the game is paused.
    - **Resume from Save**: The game automatically detects and loads the saved state when restarting Solo/Special mode.
    - **Clear on Game Over**: Saved state is automatically cleared when the game ends.
- **Restart Button**: Added a "Restart" button to the pause menu in Solo mode for quick game reset.

## [3.15.0] - 2025-12-28

### Added
- **PWA Install Prompt**: Users can now install the application as a Progressive Web App (PWA) directly from their browser. A prompt will appear on supported browsers, allowing for a native-like app experience.

### Changed
- **Game Logic Enhancements**: Minor adjustments to game logic for better performance and stability.

## [3.14.0] - 2025-12-28

### Added
- **Allow Hold Piece Setting**: Host can now toggle the "Hold Piece" feature (Settings -> ✋ Hold Piece). This setting is synchronized to all players in the room.

### Changed
- **Exit UI Streamlined**: Renamed "Exit Game" to "Exit" and removed redundant "Quit" button in Online/LAN mode for a cleaner interface.
- **Online Mode Disabled**: "Online" button is temporarily disabled in the main menu while waiting for the socket server deployment.
- **Mobile UI**: Improved hold/next piece panel layout on mobile screens.

## [3.13.0] - 2025-12-27

### Added
- **Gravity Disable Option**: Introduced a new option to disable the gravity effect in games. This allows players to play with a traditional falling piece mechanic, enhancing game customization and accessibility for different playstyles.

### Changed
- **Game Logic Refactoring**: Refactored core game logic to accommodate the new gravity disable option, ensuring smooth integration with existing game modes.

## [3.12.1] - 2025-12-27

### Fixed
- **Win/Draw Conflict Resolution**: Resolved a race condition in online games where a win or draw could be incorrectly registered due to conflicting game state updates. This ensures accurate game outcome reporting.

## [3.12.0] - 2025-12-27

### Added
- **Duo Game Touch Controls**: Introduced new touch controls for the Duo Game component, enhancing the mobile gaming experience.

## [3.11.0] - 2025-12-27

### Added
- **Opponent Board Minimization**: Added functionality to minimize the opponent's board during online games, providing a cleaner interface and more focus on the player's own board.

## [3.10.0] - 2025-12-27

### Added
- **LAN Online Mode**:
    - Introduced a new LAN online mode for the Android server, allowing local network multiplayer.
    - Implemented functionality to discover and connect to other players on the same local network.
    - Added support for host and join functionalities for LAN games.

## [3.9.0] - 2025-12-27

### Added
- **Online Game Improvements**:
    - Enhanced online game functionality with improved stability and performance.
    - Added new touch controls for a more intuitive mobile gaming experience.
    - Introduced robust disconnection handling to maintain game integrity.
- **New Solo Game Component**:
    - Implemented a new `SoloGame.vue` component for single-player gameplay.
    - Added comprehensive unit tests for the new `SoloGame` component.
- **Leaderboard Service Enhancements**:
    - Updated `LeaderboardService.ts` to support new online game features.
- **Android Server Offline Mode**:
    - Embedded the Nuxt frontend (`public/`) directly into the Go server binary using `go:embed` for offline operation.
    - Implemented auto-detection of WebSocket URL for seamless frontend-to-server connection.

### Changed
- **Board Game Logic**:
    - Refactored `Board.ts` for better performance and maintainability.
- **Control Logic**:
    - Updated `ControlLogic.test.ts` to reflect changes in control mechanisms.
- **Disconnection Handling**:
    - Improved disconnection logic in `Disconnection.test.ts` and `Disconnection2.test.ts`.
- **Reproduction Logic**:
    - Updated `Reproduction.test.ts` to align with game mechanics changes.
- **Build Scripts**:
    - Updated `scripts/bump_version.sh` and `.agent/workflows/bump_version.sh` for version management.
    - Modified `scripts/build_android_lib.sh` for Android build process.

### Fixed
- **OnlineGame Component Tests**:
    - Addressed issues in `OnlineGame.layout.test.ts`, `OnlineGame.ui.test.ts`, and `OnlineGame.winner.test.ts`.
- **SoloGame Component Tests**:
    - Fixed issues in `SoloGame.layout.test.ts`.
- **Server Parity Tests**:
    - Ensured `server_parity_test.go` passes with the latest changes.
- **Server Tests**:
    - Updated `server_test.go` to reflect new functionalities.

## [3.8.3] - 2025-12-26

### Fixed
- **Soft Drop Score Calculation**: Corrected an issue where the score for soft dropping pieces was not being calculated correctly, leading to inaccurate game scores.

## [3.8.2] - 2025-12-26

### Fixed
- **Version Info Validation**: Improved the validation logic for version information to ensure accuracy and prevent potential display issues.

## [3.8.1] - 2025-12-26

### Fixed
- **Android WebView Polyfill**: Addressed an issue where the Android WebView polyfill was not correctly applied, potentially causing rendering or functionality problems in certain Android environments.

## [3.9.0] - 2025-12-25

### Added
- **Offline Plane Mode (Android Server)**:
    - Added support for running the game server locally on Android without internet.
    - Embedded the Nuxt frontend (`public/`) directly into the Go server binary using `go:embed`.
    - Implemented auto-detection of WebSocket URL: the frontend now automatically connects to `ws://host:port/ws` when served from the same origin.
    - This allows full multiplayer (LAN Party) support on an airplane by using one Android phone as both Hotspot and Game Server.

## [3.8.0] - 2025-12-25

### Added
- **Online Game Duration Tracking**: Implemented the ability to track the duration of online game sessions. This feature provides data on how long each online match lasts.

## [3.7.0] - 2025-12-25

### Added
- **Online Match History**: Users can now view their past online matches, providing a record of their gameplay history.

## [3.6.0] - 2025-12-25

### Added
- **LAN Keyboard Controls**: Introduced keyboard controls for Local Area Network (LAN) gameplay, allowing players to control their characters directly via keyboard input in multiplayer sessions.

## [3.5.0] - 2025-12-25

### Added
- **P1 Touch Controls**: Introduced a new set of touch controls specifically for Player 1, enhancing mobile and touch-screen gameplay accessibility.

## [3.4.0] - 2025-12-25

### Added
- **Online Pause and Resume**: Implemented the ability to pause and resume online game sessions. This allows players to temporarily halt gameplay without losing their progress or disconnecting from the server.

## [3.3.0] - 2025-12-24

### Added
- **Leaderboard Integration**: Implemented integration with a leaderboard system to display and track player scores.

## [3.2.1] - 2025-12-24

### Added
- **On-screen Buttons Hold Panel**: Introduced a new panel for on-screen buttons that supports a hold action.

## [3.2.0] - 2025-12-24

### Added
- **Visual Effect System**: Introduced a new visual effect system for enhanced graphical feedback and immersion.
- **Customizable Effects**: Added the ability to customize various parameters of the visual effects.
- **Performance Optimizations**: Implemented optimizations for the visual effect system to ensure smooth performance.

## [3.1.0] - 2025-12-24

### Added
- **Special Mode Cascade**: Implemented a new "special mode cascade" feature, allowing for sequential activation of special game modes. This enhances gameplay variety and strategic depth.

## [3.0.1] - 2025-12-23

### Added
- **Version Display**: Added a visible display for the current game version in the UI.
- **Version Positioning**: Introduced a new setting to control the position of the version display.
- **Dynamic HMR Detection**: Implemented a custom Vite plugin (`gitVersionPlugin.ts`) that:
  - Detects uncommitted changes (dirty state) in real-time during development
  - Shows `HMR` indicator when there are uncommitted changes
  - Shows commit hash when code is committed
  - Re-evaluates git status on every file change via `handleHotUpdate()`

## [3.0.0] - 2025-12-23

### 🚀 Major Release - Nuxt.js Migration

This marks the official migration from the Vite-based `client-ts` to the new **Nuxt.js-based `client-nuxt`** architecture.

### Added
- **Nuxt.js Framework**: Migrated from Vite to Nuxt.js 4 for better SSR, routing, and module ecosystem support.
- **Vue 3 Components**: Restructured game logic into Vue 3 composables and components.
- **New Directory Structure**: Adopted Nuxt's `app/` directory convention.

### Changed
- **Game Logic**: Core game logic (`Game.ts`, `Board.ts`, `Tetromino.ts`) ported to new architecture.
- **Testing**: Migrated tests to work with Nuxt + Vitest setup.
- **Build System**: Switched from Vite to Nuxt's integrated build system.

### Migrated Features (from client-ts 1.6.0)
- Solo Mode with Hold mechanic
- Special Mode with Cascade Gravity
- Duo Local Multiplayer Mode
- Google Authentication
- Online Leaderboard
- PWA Support
- Mobile Gesture Controls
- Auto Save/Restore
- Wall Kicks (SRS)

### Breaking Changes
- Project structure completely refactored
- Import paths changed from `@/` to Nuxt conventions
- Some component APIs may differ

---

*For previous changelog entries, see [client-ts/CHANGELOG.md](../client-ts/CHANGELOG.md)*