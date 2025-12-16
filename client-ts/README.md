# Tetris Battle (Client-TS)

Old C++/Raylib client is being migrated to this **TypeScript + HTML5 Canvas** version.

## 🚀 Features

- **PWA Support:** Installable on Mobile/Desktop, Offline capable.
- **Responsive UI:** Adapts to mobile and desktop screens.
- **Controls:**
    - **Keyboard:** Arrows to move, Space to Drop, P to Pause.
    - **Touch:** Swipe to move/drop, Tap to rotate (Mobile optimized).
- **Game Modes:** Currently "Solo Mode" (Offline). Multiplayer coming soon.

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

## 📂 Project Structure

- `src/game/`: Core Game Logic (Board, Tetromino, Game Loop).
- `src/game/GameUI.ts`: DOM-based UI overlay (Menus, Buttons).
- `src/game/Renderer.ts`: Canvas rendering.
- `src/pwa/`: Service Worker registration.
- `public/`: Assets and Manifest.

## 📝 Recent Changes
See [CHANGELOG.md](./CHANGELOG.md) for details on recent bug fixes and features.
