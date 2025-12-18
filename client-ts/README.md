# Tetris Battle (Client-TS)

Old C++/Raylib client is being migrated to this **TypeScript + HTML5 Canvas** version.

## 🚀 Features

- **PWA Support:** Installable on Mobile/Desktop, Offline capable.
- **Responsive UI:** Adapts to mobile and desktop screens.
- **Game Modes:**
    - **Classic Solo Mode**: Standard Tetris gameplay.
    - **Special Mode**: Features "Cascade Gravity" and **Hold Mechanic**.
    - **Offline Support**: Full gameplay, Auto-Save without internet.
    - **Leaderboard**: Local offline leaderboard to track top scores (separate lists for Solo and Special modes).
    - **Google Authentication**: Sign in with Google to save scores and access features across devices.
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
- Firebase Project (for Google Auth)

### Configuration
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase configuration keys in `.env`:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   ...
   ```

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

### Debug
```bash
# In Browser Console:
enableLogs(true)  # Enable persistent logging to Local Storage
downloadLogs()    # Download collected logs as a file
clearLogs()       # Clear existing logs
```

## 🔄 Git Hooks Workflow
- **Pre-commit:** Automatically runs `npm test` and `npm run build` before allowing a commit.
- **Post-commit:** Automatically triggers **HMR Restart** if server is running, or launches a new one if not.

> To enable these hooks, run: `cp scripts/hooks/* .git/hooks/`

## 📂 Project Structure

- `src/game/`: Core Game Logic (Board, Tetromino, Game Loop).
- `src/game/GameUI.ts`: DOM-based UI overlay (Menus, Buttons).
- `src/game/Renderer.ts`: Canvas rendering.
- `src/pwa/`: Service Worker registration.
- `public/`: Assets and Manifest.

## 📝 Recent Changes
See [CHANGELOG.md](./CHANGELOG.md) for details on recent bug fixes and features.
