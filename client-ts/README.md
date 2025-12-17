# Tetris Battle (Client-TS)

Old C++/Raylib client is being migrated to this **TypeScript + HTML5 Canvas** version.

## 🚀 Features

- **PWA Support:** Installable on Mobile/Desktop, Offline capable.
- **Responsive UI:** Adapts to mobile and desktop screens.
- **Game Modes:**
    - **Classic Solo Mode**: Standard Tetris gameplay.
    - **Special Mode**: Features "Cascade Gravity" and **Hold Mechanic**.
    - **Offline Support**: Full gameplay, Auto-Save, and Local Leaderboard without internet.
- **Controls:**
    - **Keyboard:** 
        - Vectors: Arrows to move, Up to rotate.
        - Dropping: Space (Hard Drop), Down (Soft Drop).
        - Utility: 'C' or 'Shift' to **Hold** (Special Mode), 'P' to Pause, 'R' to Restart.
    - **Touch (Mobile):** 
        - Swipe L/R to move.
        - Swipe Down to Drop (Hard Drop).
        - Swipe Up to **Hold**.
        - Tap to Rotate.
        - Long Press to Soft Drop.

## 🛠 Setup & Run

### Prerequisites
- Node.js v18+

### Installation
```bash
cd client-ts
npm install
```

### Development
```bash
npm run dev
```

### Testing
```bash
npm test
```
- Includes Unit Tests for Game Logic, UI, and Navigation flows.

### Build
```bash
npm run build
```

### debug
```bash
# In Browser Console:
enableLogs(true)  # Enable persistent logging to Local Storage
downloadLogs()    # Download collected logs as a file
clearLogs()       # Clear existing logs
```

## 🔄 Git Hooks Workflow
- **Pre-commit:** Automatically runs `npm test` and `npm run build` before allowing a commit.
- **Post-commit:** Automatically runs `npm run dev` after a successful commit to launch the dev server for verification.

> To enable these hooks, run: `cp scripts/hooks/* .git/hooks/`

## 📂 Project Structure

- `src/game/`: Core Game Logic (Board, Tetromino, Game Loop).
- `src/game/GameUI.ts`: DOM-based UI overlay (Menus, Buttons).
- `src/game/Renderer.ts`: Canvas rendering.
- `src/pwa/`: Service Worker registration.
- `public/`: Assets and Manifest.

## 📝 Recent Changes
See [CHANGELOG.md](./CHANGELOG.md) for details on recent bug fixes and features.
