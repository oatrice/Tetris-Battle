# Changelog

## [1.5.0] - 2025-12-19
### Changed
- **Refined Coop Sync**:
    - Increased `CoopSync` synchronization interval to 200ms for potentially smoother network performance.
    - Improved robustness of `CoopSync` packet handling and state reconciliation.
- **Enhanced Coop Input**:
    - `CoopInputHandler` now supports more flexible keybindings for both players.
- **Optimized Coop Rendering**:
    - `CoopRenderer` optimizations for a more efficient display of the wider coop board.
- **Improved Room Management**:
    - `RoomManager` now provides clearer feedback on room creation and joining status.
- **Deterministic Pieces**:
    - `DeterministicPieces` now generates sequences with greater seed integrity for consistent coop gameplay.
### Fixed
- Addressed a rare race condition in `CoopGame` that could occur during rapid piece drops.
- Fixed a visual glitch in `CoopRenderer` when displaying the zone divider at certain board states.
- Resolved an issue with `CoopSync` not correctly handling rapid changes in player input.

## [1.4.0] - 2025-12-19
### Added
- **🎮 Coop Mode (2 Players)**: 
    - Cooperative multiplayer gameplay on a shared 24x12 horizontal board.
    - **Core Components**:
        - `CoopBoard`: Horizontal board with defined player zones (P1: columns 0-11, P2: columns 12-23).
        - `DualPieceController`: Manages two independent falling pieces with simultaneous player control.
        - `CoopRenderer`: Custom renderer for the wider board with zone divider visualization.
        - `CoopGame`: Game controller with game loop, scoring, and level progression.
        - `CoopInputHandler`: Dual keyboard support (Player 1: WASD+Q/E, Player 2: Arrows+Space/Shift).
    - **Networking**:
        - `RoomManager`: Create, join, and manage multiplayer rooms via Firebase Realtime Database.
        - `CoopSync`: **Real-time game state synchronization** between players (100ms sync interval).
            - Syncs board state, both players' pieces, positions, score, lines, and level.
            - Conflict resolution using max values for score/lines/level.
            - Automatic player ID detection (Firebase Auth or guest ID).
        - `RealtimeService`: Firebase Realtime Database wrapper with graceful error handling.
    - **UI**:
        - Added "Coop Mode" button in Home Menu.
        - Room creation and joining flow with Room ID sharing.
        - Dynamic import for Coop components (code-splitting).
        - Full game integration with canvas rendering and stats display.
    - **Testing**: Comprehensive TDD tests for `CoopBoard` (17 tests) and `DualPieceController` (18 tests).

### Changed
- **GameMode**: Added `COOP` enum value.
- **Environment**: Added `VITE_FIREBASE_DATABASE_URL` requirement for Coop Mode.
- **Documentation**: Updated README with Coop Mode features and Firebase Realtime Database setup instructions.
- **CoopSync**: Refactored to support `CoopGame` instead of `Game`, with proper dual-piece synchronization.

### Fixed
- **RealtimeService**: Fixed `process.env` to `import.meta.env` for Vite compatibility.
- **CoopSync**: Fixed `getCurrentUser()` method call to use `getAuth()?.currentUser` for proper Firebase Auth integration.

## [1.3.5] - 2025-12-19
### Changed
- **Mobile Styling**: Refined mobile styling to improve layout consistency and responsiveness across different devices.
- **Layout Tests**: Updated tests for `Layout.test.ts` and `MobileStyle.test.ts` to reflect recent changes in UI and styling.
- **Main Entry Point**: Adjusted `main.ts` to incorporate the latest UI and styling updates.

## [1.3.4] - 2025-12-19
### Changed
- **Margin Top**: Adjusted CSS to correctly set the `margin-top` property for elements within the game UI, ensuring proper spacing and alignment.

## [1.3.3] - 2025-12-19
### Fixed
- **Touch Scrolling**: Resolved an issue where touch scrolling was not functioning correctly in the game UI, improving mobile and touch-based gameplay.

## [1.3.2] - 2025-12-19
### Changed
- **CSS Styling**: Updated `style.css` to refine visual elements and ensure consistency with the new pastel theme.

## [1.3.1] - 2025-12-19
### Added
- **Layout Persistence**: Implemented functionality to save and load custom UI layouts, allowing players to retain their preferred arrangements of game elements.

### Changed
- **GameUI Refinements**:
    - **Layout Management**: Updated `GameUI` to utilize the new layout persistence features.
    - **Renderer Updates**: Made minor adjustments to `Renderer` to accommodate potential layout changes.
- **Main Entry Point**: Modified `main.ts` to initialize layout persistence.

### Fixed
- **Layout Test Stability**: Addressed an issue in `Layout.test.ts` that could cause test failures due to layout inconsistencies.

## [1.3.0] - 2025-12-19
### Changed
- **Visuals**:
    - **Pastel Theme**: Updated all Tetromino colors to vivid saturated pastel tones for a modern, cleaner look.
    - **Locked Blocks**: Changed locked block color from generic gray to "Pastel Blue-Grey" (#546E7A) to fit the new theme.
    - **Effects**: Updated Line Clear visual effects to match the specific color of the cleared lines (cyan, green, orange, yellow).

## [1.2.2] - 2025-12-18
### Added
- **Auto Save Enhancements**:
    - **Separate Save States**: Implemented distinct save files for "Solo" (`tetris_state`) and "Special" (`tetris_state_special`) modes, preventing data overwrites when switching modes.
    - **Quit to Home Save**: Game now auto-saves when returning to the Home menu.
    - **Pause Save**: Game now saves immediately upon pausing.

### Fixed
- **Special Mode Loading**: Fixed a critical bug where starting "Special Mode" would always force a reset (ignoring save files). It now correctly attempts to load the previous state first.
- **Resume Button Logic**: Fixed "Pause/Resume" button text logic to correctly display "Resume" when loading a saved game that was paused.

## [1.2.1] - 2025-12-18
### Fixed
- **Input Handling**: Fixed a bug where horizontal swipes could accidentally trigger vertical swipe actions (Hard Drop/Hold) due to touch drift.

## [1.2.0] - 2025-12-18
### Added
- **Online Leaderboard**:
    - DualScore System: Scores are saved both locally and to Cloud Firestore.
    - **Global Rankings**: View top 10 players worldwide in the new "Leaderboard Overlay".
    - **Live Updates**: Fetch scores asynchronously on demand.
- **PWA**: Custom App Icon (192x192) added for better installation experience.

## [1.1.0] - 2025-12-18
### Added
- **Google Auth**: Integrated Firebase Authentication for Google Sign-In.
- **Auth Resilience**: Added robust fallback check for Firebase configuration. Disables Google Sign-In gracefully in offline/misconfigured environments.
- **Leaderboard**: 
    - Updated local leaderboard storage to support User ID and Photo URL.
    - Implemented migration strategy for Legacy scores to "Solo" mode.
    - Added auto-merge logic to associate anonymous "Guest" scores with User ID upon sign-in.
- **UX**: Added placeholder avatar for users without a Google Photo URL.

### Fixed
- **Concurrency/Race Condition**: Fixed a critical bug in Special Mode where input actions (Move/Hold) were possible during "Cascade Gravity" animations. Inputs are now blocked until gravity settles.

## [1.0.4] - 2025-12-18
### Fixed
- **Leaderboard Bugs**: Separated high scores for "Solo Mode" and "Special Mode". Each mode now maintains its own independent leaderboard to ensure fair competition.
- **Backward Compatibility**: Added migration check to preserve existing offline scores.

## [1.0.3] - 2025-12-17
### Added
- **HUD Improvements**: 
    - Added "Game Mode" indicator (Normal / Special) to the Player Info HUD.
    - Improved Version Display in Dev Mode: Shows "Current Time" for HMR/Dirty builds vs "Commit Date" for clean builds.
    - Refactored HUD rendering to use safe DOM manupulation (XSS protection).

## [1.0.2] - 2025-12-17
### Added
- **Game Over Stats**: Now displays Player Name, Score, and Best Score on the Game Over screen.
- **Async Visual Effects**: Line clear animations now run independently (asynchronously) from Game Logic. Gravity and other mechanics no longer wait for visual effects to finish, improving responsiveness.
- **Dev Enhancements**: 
    - Added HMR (Hot Module Replacement) timestamp to Version Info in development mode for easier debugging.
    - Git Check: Detects local changes (Dirty state) and marks version as "Dev Changes".

## [1.0.1] - 2025-12-17
### Added
- **Mobile Gestures**: Added "Swipe Up" gesture to trigger **Hold** action.
- **Dev Tools**: Home Screen now displays detailed Version/Commit info in Development environment (Prod shows Clean Version).

## [1.0.0] - 2025-12-17
### Added
- **Hold Mechanic (Special Mode):**
    - Press 'C' or 'Shift' to hold a piece (Strategic swapping).
    - Only available in "Special Mode".
    - UI indicator for held piece.
- **Gesture Controls:** Mobile-friendly swipe and tap controls.
- **Offline Mode:** Local Leaderboard and offline renaming support.
- **Wall Kicks (SRS):** Advanced rotation maneuvers (T-Spins, etc.).
- **Auto Save/Restore:** Never lose game progress on browser refresh or close.
- **Leaderboard:** Local offline leaderboard to track top scores.

## [0.4.0] - 2025-12-17
### Added
- **Special Mode**: Added "Special Mode" with Cascade Gravity mechanics.
- **Gravity Animation**: Blocks now fall step-by-step in Special Mode with a 500ms delay.
- **Chain Reactions**: Implemented recursive line clearing for multi-step combos in Special Mode.
- **UI Update**: Added toggle button in Home Menu to switch between Solo and Special Mode.

## [0.3.3] - 2025-12-16
### Changed
- **Logging:** Disabled automatic saving of debug logs to LocalStorage by default to conserve space. Added global console command `enableLogs(true)` to re-enable them for debugging.

## [0.3.2] - 2025-12-16
### Fixed
- **Refresh Command Conflict:** Fixed a bug where pressing `Cmd+R` (or `Ctrl+R`) to refresh would trigger a Game Restart (clearing the score) before reloading. The InputHandler now ignores key presses combined with modifier keys.
- **Race Condition:** Fixed a race condition between game initialization and UI event listeners that could cause state to be overwritten with empty data on load.
- **Logging:** Added `Logger` utility for persistent debugging logs in LocalStorage.

## [0.3.1] - 2025-12-16
### Fixed
- **State Persistence:** Fixed an issue where the game state was not saved when refreshing the tab or closing the window (`beforeunload` event).

## [0.3.0] - 2025-12-16

### Added
- **Wall Kicks (SRS):**
    - Implemented Super Rotation System (SRS) logic.
    - Allows pieces (T, I, S, Z, L, J) to rotate when obstructed by walls or floor by testing alternative positions.
    - Enables advanced moves like T-Spins.
    - Added `WallKick.test.ts` to verify kick tables and behavior.

## [0.2.0] - 2025-12-16

### Added
- **Auto Save & Restore:**
    - Game state is now automatically saved when the window loses focus (blur).
    - Game automatically pauses on blur.
    - Game state is restored when the window regains focus.
    - Prevents accidental loss of progress when switching tabs or apps.
- **Service Worker:** updated to use "Network First" strategy. Users will always get the latest version if online, falling back to cache only when offline.
## [0.1.0] - 2025-12-16

### Fixed
- **Gravity Reset:** Fixed a bug where game speed (gravity) would not reset after Game Over or Restart, causing new games to start at high speed.
- **Game Over UI:** 
    - Fixed "Quit to Home" triggering Game Over screen.
    - Added "Restart" button to Game Over screen.
    - Improved Game Over menu styling (Overlay, Gradient Button).
    - Fixed Game Over overlay lingering when starting a new game from Home.
- **Pause Button:** Fixed Pause button text showing "Resume" incorrectly after quitting to home and starting a new game.
- **PWA Updates:** Enabled automatic Service Worker updates on page reload to ensure the latest UI is served (Fixes "Refresh vs Hard Refresh" issue).

### Added
- **Game Navigation Tests:** Added `GameNavigation.test.ts` to verify flow between Home, Game, Pause, and Game Over states.
- **Button State Tests:** Added `GameButtonState.test.ts` to verify UI button text states.

### Changed
- **Refactoring:** Moved Game Over UI rendering from Canvas (`Renderer.ts`) to DOM (`GameUI.ts`) for better interactivity and styling.