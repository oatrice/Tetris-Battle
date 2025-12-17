# Changelog

## [Unreleased]
- Added "Special Mode" with Cascade Gravity mechanics.
- Implemented "Gravity Animation" allowing blocks to fall step-by-step in Special Mode.
- Added UI button to toggle between Solo and Special Mode.

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
