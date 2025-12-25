# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Version Display & HMR Detection

The app includes a dynamic version display system that shows:

| State | Display | Description |
|-------|---------|-------------|
| **Dirty** (Uncommitted changes) | `v3.0.1 (HMR) 11:30:45 PM` | Shows HMR indicator + current time |
| **Clean** (Committed) | `v3.0.1 (abc1234) Dec 23, 2025` | Shows commit hash + commit date |
| **Production** | `v3.0.1` | Shows version only |

### How it works
- Uses a custom **Vite Plugin** (`plugins/gitVersionPlugin.ts`) that:
  - Evaluates `git status` on every file change via `handleHotUpdate()`
  - Provides a virtual module `virtual:git-version` with dynamic git info
  - Re-evaluates dirty state on each HMR update

### Key Files
- `plugins/gitVersionPlugin.ts` - Vite plugin for git status detection
- `app/composables/useVersionInfo.ts` - Composable to access version info
- `app/components/VersionInfo.vue` - UI component for version display
## Offline Server (Plane Mode) ✈️

You can run the full multiplayer game server on an Android device without internet (e.g., on an airplane).

### How it works
The Go server (`server.go`) now:
1.  **Embeds the Frontend:** The built Nuxt static files are embedded inside the Go binary.
2.  **Serves Everything:** It acts as both the Web Server (HTTP) and Game Server (WebSocket).

### How to Build & Run
1.  **Build the Frontend:**
    ```bash
    npm run generate
    ```
    *(This creates the static files in `.output/public`, which the Go build script will auto-copy)*

2.  **Build for Android (ARM64):**
    ```bash
    # This command builds the binary 'tetris-server-android'
    # It automatically embeds the generated frontend files
    GOOS=linux GOARCH=arm64 go build -o tetris-server-android server.go
    ```

3.  **Run on Android (Termux):**
    - Copy `tetris-server-android` to your phone.
    - Run in Termux:
      ```bash
      chmod +x tetris-server-android
      ./tetris-server-android
      ```
    - Connect other devices (iPad, Laptop) to the phone's Hotspot.
    - Open browser on devices: `http://<PHONE_IP>:8080`
