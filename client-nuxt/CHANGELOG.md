# Changelog

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