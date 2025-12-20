# Changelog

## [2.5.0] - 2025-12-20
### Added
- **Public Access to Leaderboard**:
    - Introduced a new public endpoint to fetch leaderboard data.
    - This allows external applications or services to access and display leaderboard information without requiring authentication.

## [2.4.0] - 2025-12-20
### Added
- **💾 Team Score Leaderboard (Offline-First with Auto-Sync)**: 
    - Implemented `CoopLeaderboard` for Cooperative Mode team scores.
    - **Local Storage Priority**: Team scores are saved to Local Storage immediately upon Game Over, ensuring no data loss.
    - **Sync Queue**: Scores are queued when offline or Firestore is unavailable.
    - **Auto-Sync**: Automatically syncs queued scores to Firestore when internet connection is restored (via `online` event listener).
    - **Network Resilience**: Scores remain in Local Storage even if online sync fails, preventing data loss.
    - **Team Score Data**:
        - Player 1 & Player 2 names
        - Individual scores (`scoreP1`, `scoreP2`)
        - Total team score
        - Individual lines cleared (`linesP1`, `linesP2`)
        - Timestamp
    - **Integration**: `CoopGame` automatically saves team scores on Game Over.
- **Testing**: Comprehensive TDD tests for `CoopLeaderboard` (8 test cases covering offline, online, sync queue, and network resilience).

## [2.3.0] - 2025-12-20
### Added
- **PWA Authentication Loading State**: Implemented a dedicated loading state for PWA authentication, providing a clearer user experience during the authentication process.

## [2.2.1] - 2025-12-20
### Changed
- **Refined P2P Connection UI**: Improved the user interface for P2P connections, providing clearer feedback and more intuitive controls for establishing and managing peer-to-peer sessions.
- **Optimized WebRTC Sync**: Enhanced the WebRTC synchronization logic for more robust and efficient data transfer in cooperative modes.
- **Updated Game Logic**: Made minor adjustments to game logic for smoother gameplay and better integration with new cooperative features.
- **Enhanced Firebase Signaling**: Improved the reliability and efficiency of Firebase-based signaling for initiating and managing P2P connections.
- **Streamlined Hybrid Sync**: Optimized the hybrid synchronization mechanism to better balance local and remote updates.

## [2.2.0] - 2025-12-19
### Added
- **🌐 P2P Offline Cooperative Mode**: Enables local multiplayer sessions where two players can play cooperatively on a shared board without an internet connection. This feature utilizes local network discovery and connection for peer-to-peer communication.
- **📊 Network Statistics Display**: Introduced a new overlay that displays P2P network statistics, including ping, packet loss, and bandwidth usage, to aid in debugging and performance monitoring of the offline cooperative mode.

## [2.1.0] - 2025-12-19
### Added
- **📱 Mobile Touch Controls for Coop Mode**: Full gesture support for mobile players in Cooperative Mode.
    - Swipe L/R to move pieces.
    - Swipe Down for Hard Drop.
    - Swipe Up to Hold.
    - Tap to Rotate.
    - Long Press for Soft Drop.
    - DAS (Delayed Auto Shift) via continuous swipe.
- **Testing**: Added comprehensive TDD tests for `CoopInputHandler` touch controls (12 test cases).

## [2.0.0] - 2025-12-19
### Added
- **🎮 Coop Mode (2 Players)**: Complete implementation of Cooperative Multiplayer on a shared board.
    - **Core Gameplay**:
        - Shared 24x12 horizontal board (P1: Left, P2: Right).
        - Dual independent falling pieces with simultaneous control.
        - `CoopGame` controller for loop, scoring, and level progression.
        - `CoopInputHandler` for managing input for both players.

    - **Networking & Synchronization**:

        - **Real-time Sync**: `CoopSync` ensures state consistency between players (utilizing Firebase Realtime Database).
        - **Pause/Resume Sync**: Robust synchronization of pause states between clients.
        - **Room Management**: Create and join rooms easily with `RoomManager`.
    - **Rendering**: `CoopRenderer` for the wider board and zone visualization.
    - **Deterministic Gameplay**: `DeterministicPieces` and enhanced `SeededRandom` for consistent piece sequences.
- **UI Refinements**:
    - **Next Piece Panel**: Improved styling and visual hierarchy.
    - **Login Flow**: Optimized visibility of login elements.
- **Testing**: Comprehensive TDD tests for Coop components (`CoopBoard`, `DualPieceController`).

### Changed
- **Documentation**: Updated README and CHANGELOG to reflect the major version milestone.
- **Mobile UI**: Adjusted margins and layout for player names and login addresses to ensure visibility on small screens.
- **Coop Optimizations**:
    - Increased sync interval to 200ms for smoother performance.
    - Improved robustness of packet handling and state reconciliation.
    - `CoopInputHandler` supports flexible keybindings.
- **Environment**: Added `VITE_FIREBASE_DATABASE_URL` requirement.

### Fixed
- **Coop Sync Issues**:
    - Resolved critical issue where P1's piece wasn't rendering for P2.
    - Fixed race conditions in rapid piece drops and input handling.
    - Adjusted `CoopSync` to correctly use Firebase Auth current user.
- **Rendering Artifacts**: Fixed visual glitches in `CoopRenderer` (collision detection, zone divider).
- **Service & Environment**: Fixed `process.env` usage for Vite compatibility.
- **Auth UI**: Fixed login UI discrepancies on mobile.

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