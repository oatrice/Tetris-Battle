# Tetris Battle

**🚧 Status: Migrating to TypeScript/Web Client 🚧**

This project is currently being migrated from a C++/Raylib desktop application to a modern **TypeScript/Vite Web Application (PWA)** for better accessibility and cross-platform support.

## 🌟 New TypeScript Client (Recommended)

Please proceed to the `client-ts` directory for the latest version.

- **Directory:** [`/client-ts`](./client-ts)
- **Tech Stack:** TypeScript, Vite, HTML5 Canvas
- **Features:** PWA (Offline Support), Mobile Controls, Modern UI
- **Setup:**
  ```bash
  cd client-ts
  npm install
  npm run dev
  ```

---

# Legacy C++ Version (Raylib)

*The documentation below applies to the original C++ implementation.*

A modern Tetris game built with Raylib, featuring single-player, local two-player, and online two-player modes. Compete against friends locally or online to see who can clear lines faster and survive longer!

## Features

*   **Single-Player Mode:** Enjoy the classic Tetris experience, focusing on high scores and endless play.
*   **Local Two-Player Mode:** Challenge a friend on the same machine in a head-to-head battle.
    *   Player 1 uses Arrow Keys, Player 2 uses WASD.
    *   Separate boards, scores, and next piece previews.
    *   First player to reach Game Over loses; the other player wins.
*   **Online Two-Player Mode (Network):** Play against friends over a local network or the internet.
    *   **Host Game:** Start a server and share your IP address with an opponent.
    *   **Join Game:** Connect to a host's IP address to challenge them.
    *   Real-time synchronization of game state (board, score, next piece) and player actions.
    *   Automatic winner detection and game-over handling.
*   **Player Name Customization:**
    *   Enter your name on the title screen, which is saved for future sessions.
    *   Change your name anytime from the in-game UI.
*   **Enhanced Controls:**
    *   **Delayed Auto Shift (DAS):** Smooth and responsive horizontal movement for a competitive edge.
    *   **Soft Drop Safety:** Prevents accidental soft dropping of a newly spawned piece if the 'down' key is held.
    *   **On-Screen Keyboard (OSK):** Convenient for name and IP address input, especially on touch devices or Web builds.
*   **Intuitive UI/UX:**
    *   Clear mode selection and network setup screens.
    *   Pause functionality.
    *   Comprehensive Game Over screen displaying winner and scores for all modes.
    *   Dynamic UI elements for two-player layouts.
*   **Cross-Platform:** Powered by Raylib, allowing for easy compilation and execution on various platforms (Windows, Linux, macOS, WebAssembly).

## How to Play

### Getting Started

1.  **Launch the Game:** Upon launching, you'll be prompted to enter your player name. This name will be saved for future sessions.
2.  **Mode Selection:** After entering your name, choose your desired game mode:
    *   `1 Player`: Classic single-player Tetris.
    *   `2 Player (Local)`: Two players on the same computer.
    *   `2 Player (Online)`: Network multiplayer (Host or Join).

### Controls

#### Player 1 (Keyboard & Touch)

*   **Move Left:** `Left Arrow` / On-screen `<` button
*   **Move Right:** `Right Arrow` / On-screen `>` button
*   **Rotate Piece:** `Up Arrow` or `Spacebar` / On-screen `^` button
*   **Soft Drop (continuous):** `Down Arrow` / On-screen `v` button
*   **Restart Game / Disconnect (Network):** `R` key / On-screen "Restart" button
*   **Pause / Unpause Game:** `P` key / On-screen "Pause" button
*   **Change Name (Return to Title Screen):** `N` key / On-screen "Change Name" button

#### Player 2 (Keyboard - Local Multiplayer Only)

*   **Move Left:** `A` key
*   **Move Right:** `D` key
*   **Rotate Piece:** `W` key
*   **Soft Drop (continuous):** `S` key

### Online Multiplayer Instructions

To play online, one player must **Host** the game, and the other must **Join**.

#### Hosting a Game

1.  From the "Mode Selection" screen, choose "2 Player (Online)".
2.  Select "Host Game".
3.  The game will display your local IP address (e.g., `192.168.1.100:12345`). **You need to share this IP address with your friend.**
    *   _Note:_ The displayed IP might initially be `127.0.0.1` (loopback). For actual network play, your friend will need your local network IP (e.g., `192.168.x.x`) or external IP if playing over the internet.
4.  Once your friend successfully connects, the "Start Online" button will become active. Click it to begin the game!

#### Joining a Game

1.  From the "Mode Selection" screen, choose "2 Player (Online)".
2.  Select "Join Game".
3.  Enter the host's IP address (e.g., `192.168.1.100`) into the input field. The default port (`:12345` for desktop, `:12346` for Web) will be appended automatically.
    *   Use the on-screen keyboard or your physical keyboard for input.
4.  Click "Connect" (or press `Enter`).
5.  Wait for the host to start the game.

#### Important Network Notes

*   **Firewall/Port Forwarding:** If playing over the internet, the host might need to configure their router for port forwarding. The default port is `12345` for desktop applications and `12346` for Web/WebSocket builds.
*   **IP Address:** For local network play, ensure you're using the host's actual local network IP (e.g., `192.168.x.x`). For internet play, a public IP or a service like Hamachi/ZeroTier might be needed.
*   **Connection Errors:** If a connection fails or is lost, an error message will be displayed, and you'll be prompted to retry.

## Building and Running

This project uses Raylib and CMake.

### Dependencies

*   **Raylib:** A simple and easy-to-use library to enjoy videogames programming.
    *   Ensure Raylib is installed on your system or configured for your build environment.

### Build Steps

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/oatrice/Tetris-Battle.git
    cd Tetris-Battle
    ```
2.  **Create a Build Directory:**
    ```bash
    mkdir build
    cd build
    ```
3.  **Configure CMake:**
    ```bash
    cmake ..
    ```
    _For Emscripten (WebAssembly) builds, you might use:_
    ```bash
    emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_WEB=ON
    ```
4.  **Build the Project:**
    ```bash
    cmake --build .
    ```
    _For Emscripten builds:_
    ```bash
    emmake make
    ```
5.  **Run the Game:**
    ```bash
    ./client/tetris_battle_client
    ```
    _For Emscripten, you'll get `tetris_battle_client.html`, `tetris_battle_client.js`, `tetris_battle_client.wasm` in the `client` directory. You can serve them with a simple web server (e.g., `python3 -m http.server`)._

---