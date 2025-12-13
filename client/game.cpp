#include "game.h"
#include "network_protocol.h" // Include Protocol
#include "raylib.h"           // For LoadFileText, SaveFileText
#include <algorithm>          // Required for std::max
#include <vector>             // Required for std::vector in max initialization

// Placeholder for getting local IP address (implementation depends on
// OS/platform)
std::string Game::GetLocalIPAddress() {
  // In a real application, you'd use platform-specific network APIs
  // For example, on Linux: `hostname -I | awk '{print $1}'`
  // On Windows: `ipconfig`
  // For mobile browsers (WebAssembly), direct local IP access might not be
  // possible due to browser security models. A signaling server or STUN/TURN
  // server would typically be used to discover external IPs or facilitate
  // WebRTC connections. For now, this returns a loopback address, which is
  // suitable only for testing on the same machine.
  return "127.0.0.1";
}

// Start network host
void Game::StartHosting() {
  if (networkManager.StartHost(networkPort)) {
    isHost = true;
    currentNetworkState = NetworkState::HOSTING_WAITING;
    currentIpAddress = GetLocalIPAddress(); // This will show 127.0.0.1 for now
    TraceLog(LOG_INFO, "NETWORK: Started hosting on Port: %d", networkPort);
  } else {
    TraceLog(LOG_ERROR, "NETWORK: Failed to start host on Port: %d",
             networkPort);
  }
}

// Stop network host
void Game::StopHosting() {
  networkManager.Stop();
  isHost = false;
  currentNetworkState = NetworkState::DISCONNECTED;
  currentIpAddress = "";
}

// Connect to a host
void Game::ConnectToHost(const std::string &ip) {
  isHost = false;
  currentIpAddress = ip;
  currentNetworkState = NetworkState::CLIENT_CONNECTING;
  TraceLog(LOG_INFO, "NETWORK: Attempting to connect to %s:%d", ip.c_str(),
           networkPort);

  // NOTE: The current `networkManager.ConnectClient` is assumed to be a
  // blocking call for simplicity. In a production application, especially
  // for a UI-driven game, this should ideally be an asynchronous operation
  // to prevent the UI from freezing during connection attempts.
  if (networkManager.ConnectClient(ip, networkPort)) {
    currentNetworkState = NetworkState::CONNECTED;
    TraceLog(LOG_INFO, "NETWORK: Successfully connected to host.");
  } else {
    TraceLog(LOG_ERROR, "NETWORK: Failed to connect to host.");
    currentNetworkState = NetworkState::CONNECTION_FAILED;
    networkErrorMessage = "Connection Failed: Check IP/Host";
  }
}

// Disconnect from network
void Game::Disconnect() {
  if (currentNetworkState != NetworkState::DISCONNECTED) {
    TraceLog(LOG_INFO, "NETWORK: Disconnecting.");
    networkManager.Stop();
  }
  isHost = false; // Reset host flag
  currentNetworkState = NetworkState::DISCONNECTED;
  currentIpAddress = "";
  remotePlayerName = "RemotePlayer"; // Reset to default
}

// Send game events over the network
void Game::SendGameEvent(const std::string &eventData) {
  if (currentNetworkState == NetworkState::CONNECTED ||
      currentNetworkState == NetworkState::IN_GAME) {
    // TraceLog(LOG_INFO, "NETWORK: Sending event: %s", eventData.c_str());
    networkManager.SendMessageStr(eventData);
  }
}

// Process incoming network events
void Game::ProcessNetworkEvents() {
  // Update NetworkManager (Handling polling for non-threaded env like
  // Emscripten)
  networkManager.Update();

  // Check for successful hosting connection
  if (currentNetworkState == NetworkState::HOSTING_WAITING &&
      networkManager.IsConnected()) {
    currentNetworkState = NetworkState::CONNECTED;
    TraceLog(LOG_INFO, "NETWORK: Client joined!");
  }

  // Check for unexpected disconnection (but ignore if we are just waiting for a
  // host/client) If we THINK we are connected (CONNECTED or IN_GAME) but
  // manager says NO, then we lost connection.
  if ((currentNetworkState == NetworkState::CONNECTED ||
       currentNetworkState == NetworkState::IN_GAME) &&
      !networkManager.IsConnected()) {

    TraceLog(LOG_INFO, "NETWORK: Lost connection.");
    Disconnect(); // Clean up socket
    currentNetworkState = NetworkState::CONNECTION_FAILED;
    networkErrorMessage = "Connection Lost.";
    if (currentGameState == GameState::PLAYING) {
      currentGameState = GameState::NETWORK_SETUP;
    }
    return;
  }

  // Poll messages
  std::vector<std::string> messages = networkManager.PollMessages();
  for (const std::string &msg : messages) {
    NetworkMessage netMsg = NetworkProtocol::Parse(msg);

    switch (netMsg.type) {
    case NetworkMsgType::GAME_START:
      // Both seed and name might be in payload, assumed parsed into struct
      // partially or we parse manually logic here For simplicity, let's assume
      // Parse extracts seed to intParam1. We need to parse name manually from
      // payload if needed, or update Parse. Let's rely on Parse for now
      // roughly.
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        int seed = netMsg.intParam1;
        // Reset P1 (Self) and P2 (Remote/Host) with same seed
        TraceLog(LOG_INFO, "NETWORK: Received GAME_START with seed %d", seed);

        // Reset Logic
        logicPlayer1.Reset(seed);
        logicPlayer2.Reset(seed);

        // Reset Timers
        gravityTimerP1 = 0.0f;
        dasTimerP1 = 0.0f;
        lastMoveDirP1 = 0;
        waitForDownReleaseP1 = false;

        gravityTimerP2 = 0.0f; // P2 is remote, its gravity is driven by events
        dasTimerP2 = 0.0f;
        lastMoveDirP2 = 0; // P2 is remote

        // Extract Host Name if possible (Simple parsing from string for now if
        // struct inadequate) "GAME_START_HOST;SEED:123;P1_NAME:Bob"
        std::string prefix = "P1_NAME:";
        size_t pos = msg.find(prefix);
        if (pos != std::string::npos) {
          remotePlayerName = msg.substr(pos + prefix.length());
        }

        currentNetworkState = NetworkState::IN_GAME;
        currentGameState = GameState::PLAYING;
      }
      break;

    case NetworkMsgType::MOVE_LR:
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        logicPlayer2.Move(netMsg.intParam1, 0);
      }
      break;

    case NetworkMsgType::ROTATE:
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        logicPlayer2.Rotate();
      }
      break;

    case NetworkMsgType::MOVE_DOWN:
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        logicPlayer2.Tick();
      }
      break;

    case NetworkMsgType::SYNC_STATE: {
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {

        // Parse SCORE
        size_t scorePos = netMsg.payload.find("SCORE:");
        if (scorePos != std::string::npos) {
          try {
            logicPlayer2.score = std::stoi(netMsg.payload.substr(scorePos + 6));
          } catch (...) {
          }
        }

        // Parse NEXT
        size_t nextPos = netMsg.payload.find("NEXT:");
        if (nextPos != std::string::npos) {
          try {
            int nextType = std::stoi(netMsg.payload.substr(nextPos + 5));
            logicPlayer2.nextPiece = Piece(static_cast<PieceType>(nextType));
          } catch (...) {
          }
        }

        // Parse BOARD
        size_t boardPos = netMsg.payload.find("BOARD:");
        if (boardPos != std::string::npos) {
          std::string boardData = netMsg.payload.substr(boardPos + 6);
          int idx = 0;
          for (int r = 0; r < BOARD_HEIGHT; r++) {
            for (int c = 0; c < BOARD_WIDTH; c++) {
              if (idx < (int)boardData.length()) {
                int cellVal = boardData[idx] - '0';
                logicPlayer2.board.SetCell(r, c, cellVal);
                idx++;
              }
            }
          }
        }
      }
      break;
    }
      // Check for CLIENT_READY manually if not in enum
      if (msg.find("CLIENT_READY") == 0) {
        if (isHost) {
          TraceLog(LOG_INFO, "NETWORK: Client is ready.");
          // Parse Client Name
          std::string prefix = "P2_NAME:";
          size_t pos = msg.find(prefix);
          if (pos != std::string::npos) {
            remotePlayerName = msg.substr(pos + prefix.length());
          }
          // Host allows starting game now (Button active check is in
          // Draw/Update)
        }
      }
      break;
    }
  }
}

Game::Game() {
  // Initialize game state to TITLE_SCREEN to prompt for player name
  currentGameState = GameState::TITLE_SCREEN;
  currentMode = GameMode::SINGLE_PLAYER;            // Default to single player
  currentNetworkState = NetworkState::DISCONNECTED; // Default network state
  isHost = false;
  remotePlayerName = "Player2"; // Default for local or placeholder for network
  ipAddressInputBuffer = "127.0.0.1"; // Default IP for client connection

  // Initialize new game over flags
  player1IsDead = false;
  player2IsDead = false;
  winnerName = "";

  // Load player name at startup
  LoadPlayerName();
  // Initialize input buffer with the loaded name (or default "Player")
  playerNameInputBuffer = playerName;

  // Init Controls (Mobile UI) - Keep them below the boards
  int btnY = screenHeight - 80; // Place buttons near the bottom
  int btnSize = 80;
  int gap = 30;
  // Center the touch controls relative to the screen width
  int startX = (screenWidth - (4 * btnSize + 3 * gap)) / 2;

  btnLeft = {{(float)startX, (float)btnY, (float)btnSize, (float)btnSize},
             BLUE,
             "<",
             false};
  btnRight = {{(float)startX + 1 * (btnSize + gap), (float)btnY, (float)btnSize,
               (float)btnSize},
              BLUE,
              ">",
              false};
  btnRotate = {{(float)startX + 2 * (btnSize + gap), (float)btnY,
                (float)btnSize, (float)btnSize}, // Adjusted Y for touch rotate
               GREEN,
               "^",
               false};
  btnDrop = {{(float)startX + 3 * (btnSize + gap), (float)btnY, (float)btnSize,
              (float)btnSize},
             ORANGE,
             "v",
             false};

  // Initialize Restart, Pause, and Change Name Buttons (UI Area, right of P2
  // board)
  // Start lower down to avoid overlapping with Next Piece (approx 180px) and
  // Score info
  int currentY = BOARD_OFFSET_Y + 320;

  // Calculate required button width based on text to prevent overflow
  int btnTextFontSize = 30; // Matches the font size used in Draw()
  int restartTextWidth = MeasureText("Restart", btnTextFontSize);
  int pauseTextWidth = MeasureText("Pause", btnTextFontSize);
  int changeNameTextWidth = MeasureText("Change Name", btnTextFontSize);
  int singlePlayerTextWidth = MeasureText("1 Player", btnTextFontSize);
  int twoPlayerLocalTextWidth =
      MeasureText("2 Player (Local)", btnTextFontSize);
  int twoPlayerNetworkTextWidth =
      MeasureText("2 Player (Online)", btnTextFontSize);
  int hostGameTextWidth = MeasureText("Host Game", btnTextFontSize);
  int joinGameTextWidth = MeasureText("Join Game", btnTextFontSize);
  int connectTextWidth = MeasureText("Connect", btnTextFontSize);
  int startOnlineGameTextWidth = MeasureText("Start Online", btnTextFontSize);

  // Choose the maximum width and add padding (e.g., 40px total padding)
  int btnWidth =
      std::max({restartTextWidth, pauseTextWidth, changeNameTextWidth,
                singlePlayerTextWidth, twoPlayerLocalTextWidth,
                twoPlayerNetworkTextWidth, hostGameTextWidth, joinGameTextWidth,
                connectTextWidth, startOnlineGameTextWidth}) +
      40;

  int btnHeight = 40;
  int btnVerticalGap = 10;

  // Calculate X position for right-aligned UI buttons
  int uiButtonsX = screenWidth - btnWidth - 40;

  btnRestart = {
      {(float)uiButtonsX, (float)currentY, (float)btnWidth, (float)btnHeight},
      DARKBLUE,
      "Restart",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnPause = {
      {(float)uiButtonsX, (float)currentY, (float)btnWidth, (float)btnHeight},
      GOLD, // Color: GOLD as requested
      "Pause",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnChangeName = {
      {(float)uiButtonsX, (float)currentY, (float)btnWidth, (float)btnHeight},
      PURPLE, // A distinct color for Change Name
      "Change Name",
      false};

  // Initialize Mode Selection Buttons (centered on screen initially)
  int modeBtnX = (screenWidth - btnWidth) / 2;
  int modeBtnY = screenHeight / 2 - btnHeight * 2 - btnVerticalGap * 2;

  btnSinglePlayer = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      SKYBLUE,
      "1 Player",
      false};

  modeBtnY += btnHeight + btnVerticalGap;

  btnTwoPlayerLocal = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      LIME,
      "2 Player (Local)",
      false};

  modeBtnY += btnHeight + btnVerticalGap;

  btnTwoPlayerNetwork = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      ORANGE, // Distinct color for network mode
      "2 Player (Online)",
      false};

  // Initialize Network Setup Buttons (will be positioned dynamically in draw)
  // For now, just allocate them.
  btnHostGame = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      GREEN,
      "Host Game",
      false};
  btnJoinGame = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      BLUE,
      "Join Game",
      false};
  btnConnect = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      SKYBLUE,
      "Connect",
      false};
  btnStartOnlineGame = {
      {(float)modeBtnX, (float)modeBtnY, (float)btnWidth, (float)btnHeight},
      LIME,
      "Start Online",
      false};
}

Game::~Game() {
  Disconnect(); // Ensure network resources are cleaned up on exit
}

void Game::LoadPlayerName() {
  char *fileText = LoadFileText(playerNameFilename);
  if (fileText != nullptr) {
    playerName = std::string(fileText);
    UnloadFileText(fileText);
    // Trim whitespace/newlines if any
    playerName.erase(playerName.find_last_not_of(" \n\r\t") + 1);
    if (playerName.empty()) {
      playerName =
          "Player1"; // Default if file was empty or only contained whitespace
    }
  } else {
    // File not found or couldn't be loaded, set default
    playerName = "Player1";
  }
}

void Game::SavePlayerName() {
  SaveFileText(playerNameFilename, const_cast<char *>(playerName.c_str()));
}

void Game::ResetGame() {
  // Generate a shared seed to ensure both players get the same piece sequence
  // (Fixes Issue #27). Important for network mode for deterministic simulation.
  int seed = GetRandomValue(0, 2147483647);

  logicPlayer1.Reset(seed); // Resets board, score, and spawns a new piece
  gravityTimerP1 = 0.0f;
  dasTimerP1 = 0.0f;
  lastMoveDirP1 = 0;
  lastSpawnCounterP1 =
      logicPlayer1.spawnCounter; // Sync after logic.Reset() spawns a new piece
  waitForDownReleaseP1 = false;
  player1IsDead = false; // Reset dead status for P1

  if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
    logicPlayer2.Reset(seed); // Use the same seed for Player 2
    gravityTimerP2 = 0.0f;
    dasTimerP2 = 0.0f;
    lastMoveDirP2 = 0;
    lastSpawnCounterP2 = logicPlayer2.spawnCounter;
    waitForDownReleaseP2 = false;
    player2IsDead = false; // Reset dead status for P2
  } else if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST) {
    // As host, reset both local and remote (will send initial state to client)
    logicPlayer2.Reset(seed);
    gravityTimerP2 = 0.0f; // Reset for remote, but its updates will override
    dasTimerP2 = 0.0f;
    lastMoveDirP2 = 0;
    lastSpawnCounterP2 = logicPlayer2.spawnCounter;
    waitForDownReleaseP2 = false;
    player2IsDead = false; // Reset dead status for P2
    // Placeholder: Send game start message with seed to client
    SendGameEvent(TextFormat("GAME_START_HOST;SEED:%d;P1_NAME:%s", seed,
                             playerName.c_str()));
    currentNetworkState = NetworkState::IN_GAME; // Host transitions to IN_GAME
  } else if (currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
    // As client, only reset P1. P2 will be reset when GAME_START_HOST message
    // is received. Client also sends its name to host.
    SendGameEvent(TextFormat(
        "CLIENT_READY;P2_NAME:%s",
        playerName.c_str())); // Client's name is P2 from host's perspective
    player2IsDead = false;    // Reset dead status for P2 (remote)
    // Client waits for host to send GAME_START_HOST message, which will trigger
    // logicPlayer2.Reset currentNetworkState remains CONNECTED until
    // GAME_START_HOST received, then transitions to IN_GAME
  }

  winnerName = ""; // Reset winner name
  // Only transition to PLAYING if not waiting for network sync
  if (currentMode != GameMode::TWO_PLAYER_NETWORK_CLIENT ||
      currentNetworkState == NetworkState::IN_GAME) {
    currentGameState = GameState::PLAYING;
  }
  btnRestart.active = false; // Ensure button is not active after reset
  btnPause.active = false;   // Ensure pause button is not active
  btnChangeName.active =
      false; // Ensure change name button is not active after reset
}

// Helper function to handle input for a single player
void Game::HandlePlayerInput(Logic &logic, int playerIndex, float dasDelay,
                             float dasRate, float &dasTimer, int &lastMoveDir,
                             int &lastSpawnCounter, bool &waitForDownRelease) {
  // IMPORTANT: Do not process input if the player's game is over
  if (logic.isGameOver) {
    return;
  }

  // --- Soft Drop Safety Logic ---
  // 1. Detect if a new piece has spawned since the last frame
  if (logic.spawnCounter != lastSpawnCounter) {
    lastSpawnCounter = logic.spawnCounter;
    // If KEY_DOWN is currently held, activate the safety flag
    if (((playerIndex == 1 && IsKeyDown(KEY_DOWN)) ||
         (playerIndex == 2 && IsKeyDown(KEY_S))) &&
        currentMode == GameMode::TWO_PLAYER_LOCAL) { // Only check for local P2
      waitForDownRelease = true;
    }
    // For network P1, also check KEY_DOWN
    if (playerIndex == 1 && IsKeyDown(KEY_DOWN)) {
      waitForDownRelease = true;
    }
  }
  // 2. If the safety flag is active, check if KEY_DOWN has been released
  if (!(((playerIndex == 1 && IsKeyDown(KEY_DOWN)) ||
         (playerIndex == 2 && IsKeyDown(KEY_S))) &&
        currentMode == GameMode::TWO_PLAYER_LOCAL) && // Only check for local P2
      !(playerIndex == 1 && IsKeyDown(KEY_DOWN))) {   // And P1
    waitForDownRelease = false;
  }
  // --- End Soft Drop Safety Logic ---

  // --- Keyboard Delayed Auto Shift (DAS) for LEFT/RIGHT movement ---
  int currentKeyboardMoveDir = 0;
  if (playerIndex == 1) { // Player 1 uses Arrow keys
    if (IsKeyReleased(KEY_LEFT) && lastMoveDir == -1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }
    if (IsKeyReleased(KEY_RIGHT) && lastMoveDir == 1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }

    if (IsKeyDown(KEY_LEFT)) {
      currentKeyboardMoveDir = -1;
    }
    if (IsKeyDown(KEY_RIGHT)) {
      currentKeyboardMoveDir = 1;
    }
  } else { // Player 2 uses WASD (Only for local multiplayer)
    if (IsKeyReleased(KEY_A) && lastMoveDir == -1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }
    if (IsKeyReleased(KEY_D) && lastMoveDir == 1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }

    if (IsKeyDown(KEY_A)) {
      currentKeyboardMoveDir = -1;
    }
    if (IsKeyDown(KEY_D)) {
      currentKeyboardMoveDir = 1;
    }
  }

  // Check for initial press or change in active DAS direction
  if (currentKeyboardMoveDir != 0 && currentKeyboardMoveDir != lastMoveDir) {
    logic.Move(currentKeyboardMoveDir, 0); // Initial move
    if (playerIndex == 1 &&
        (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
         currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT)) {
      SendGameEvent(TextFormat("MOVE_LR;DIR:%d",
                               currentKeyboardMoveDir)); // Send event for P1
    }
    dasTimer = 0.0f; // Reset timer
    lastMoveDir = currentKeyboardMoveDir;
  }
  // If the same key is held down (DAS repeat)
  else if (currentKeyboardMoveDir != 0 &&
           currentKeyboardMoveDir == lastMoveDir) {
    dasTimer += GetFrameTime();
    while (dasTimer >= dasDelay) {
      logic.Move(lastMoveDir, 0);
      if (playerIndex == 1 &&
          (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
           currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT)) {
        SendGameEvent(
            TextFormat("MOVE_LR;DIR:%d", lastMoveDir)); // Send event for P1
      }
      dasTimer -= dasRate;
    }
  }
  // If no relevant keyboard key is down, reset DAS state
  else if (currentKeyboardMoveDir == 0) {
    dasTimer = 0.0f;
    lastMoveDir = 0;
  }
  // --- End Keyboard DAS for LEFT/RIGHT ---

  // --- Other Keyboard Controls ---
  if (playerIndex == 1) { // Player 1
    // Rotate
    if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_SPACE)) {
      logic.Rotate();
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        SendGameEvent("ROTATE"); // Send event for P1
      }
    }
    // Soft Drop (continuous) - now includes soft drop safety check
    if (IsKeyDown(KEY_DOWN) && !waitForDownRelease) {
      logic.Move(0, 1);
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        SendGameEvent("MOVE_DOWN"); // Send event for P1
      }
    }
  } else { // Player 2 (Local only, not for network)
    // Rotate
    if (IsKeyPressed(KEY_W)) {
      logic.Rotate();
    }
    // Soft Drop (continuous) - now includes soft drop safety check
    if (IsKeyDown(KEY_S) && !waitForDownRelease) {
      logic.Move(0, 1);
    }
  }
  // --- End Other Keyboard Controls ---
}

void Game::HandleInput() {
  Vector2 mouse = GetMousePosition();
  bool mouseClicked = IsMouseButtonPressed(MOUSE_LEFT_BUTTON);

  // Update cursor blink timer (always active for visual consistency)
  cursorBlinkTimer += GetFrameTime();
  if (cursorBlinkTimer >= 0.5f) { // Toggle every 0.5 seconds
    showCursor = !showCursor;
    cursorBlinkTimer = 0.0f;
  }

  // --- Global Input for Restart Button ---
  btnRestart.active = false; // Reset visual state for this frame
  if (CheckCollisionPointRec(mouse, btnRestart.rect)) {
    btnRestart.active = true;
    if (mouseClicked) {
      if (currentGameState != GameState::TITLE_SCREEN &&
          currentGameState != GameState::MODE_SELECTION &&
          currentGameState != GameState::NETWORK_SETUP) {
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          Disconnect();
          currentGameState =
              GameState::NETWORK_SETUP; // Go back to network setup
        } else {
          ResetGame();
        }
        return; // Game reset/state changed, no further input processing this
                // frame
      }
    }
  }

  // Keyboard input for Restart (e.g., 'R' key)
  if (IsKeyPressed(KEY_R)) {
    if (currentGameState != GameState::TITLE_SCREEN &&
        currentGameState != GameState::MODE_SELECTION &&
        currentGameState != GameState::NETWORK_SETUP) {
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        Disconnect();
        currentGameState = GameState::NETWORK_SETUP;
      } else {
        ResetGame();
      }
      return; // Game reset/state changed, no further input processing this
              // frame
    }
  }

  // --- Global Input for Change Name Button ---
  // Only allow changing name if not already on the title screen
  if (currentGameState != GameState::TITLE_SCREEN &&
      currentGameState != GameState::MODE_SELECTION &&
      currentGameState != GameState::NETWORK_SETUP) {
    btnChangeName.active = false; // Reset visual state for this frame
    if (CheckCollisionPointRec(mouse, btnChangeName.rect)) {
      btnChangeName.active = true;
      if (mouseClicked) {
        // Disconnect if in network mode before changing name
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          Disconnect();
        }
        // Transition to TITLE_SCREEN to change name
        currentGameState = GameState::TITLE_SCREEN;
        playerNameInputBuffer = playerName; // Pre-fill with current name
        return; // State changed, no further input processing this frame
      }
    }
  }

  // Helper variables for OSK
  bool oskEnter = false;
  bool oskBackspace = false;
  char oskChar = 0;

  // --- State-specific input handling ---
  // Only allow changing name via keyboard if not in these states
  if (currentGameState != GameState::TITLE_SCREEN &&
      currentGameState != GameState::MODE_SELECTION &&
      currentGameState != GameState::NETWORK_SETUP) {

    if (IsKeyPressed(KEY_N)) {
      if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
          currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
        Disconnect();
      }
      currentGameState = GameState::TITLE_SCREEN;
      playerNameInputBuffer = playerName; // Pre-fill with current name
      return; // State changed, no further input processing this frame
    }
  }

  // --- State-specific input handling ---
  switch (currentGameState) {
  case GameState::TITLE_SCREEN: {
    int key = GetCharPressed();
    // Allow alphanumeric and some common symbols for name, limit length
    while (key > 0) {
      if ((key >= 32) && (key <= 125) &&
          (playerNameInputBuffer.length() < maxNameLength)) {
        playerNameInputBuffer += (char)key;
      }
      key = GetCharPressed();
    }

    // OSK Input
    oskChar =
        CheckOSKInput(screenHeight / 2 + 100, false, oskEnter, oskBackspace);
    if (oskChar && (playerNameInputBuffer.length() < maxNameLength)) {
      playerNameInputBuffer += oskChar;
    }

    if (IsKeyPressed(KEY_BACKSPACE) || oskBackspace) {
      if (!playerNameInputBuffer.empty()) {
        playerNameInputBuffer.pop_back();
      }
    }

    if (IsKeyPressed(KEY_ENTER) || oskEnter) {
      if (!playerNameInputBuffer.empty()) {
        playerName = playerNameInputBuffer;
      } else {
        playerName = "Player1"; // Default if no name entered
      }
      SavePlayerName(); // Save the new/updated player name
      currentGameState = GameState::MODE_SELECTION; // Transition to mode select
    }
    break;
  }

  case GameState::MODE_SELECTION: {
    btnSinglePlayer.active = false;
    btnTwoPlayerLocal.active = false;
    btnTwoPlayerNetwork.active = false;

    if (CheckCollisionPointRec(mouse, btnSinglePlayer.rect)) {
      btnSinglePlayer.active = true;
      if (mouseClicked) {
        currentMode = GameMode::SINGLE_PLAYER;
        ResetGame(); // Setup game for single player
        // currentGameState is set to PLAYING inside ResetGame()
        return;
      }
    }
    if (CheckCollisionPointRec(mouse, btnTwoPlayerLocal.rect)) {
      btnTwoPlayerLocal.active = true;
      if (mouseClicked) {
        currentMode = GameMode::TWO_PLAYER_LOCAL;
        ResetGame(); // Setup game for two players
        // currentGameState is set to PLAYING inside ResetGame()
        return;
      }
    }
    if (CheckCollisionPointRec(mouse, btnTwoPlayerNetwork.rect)) {
      btnTwoPlayerNetwork.active = true;
      if (mouseClicked) {
        currentGameState =
            GameState::NETWORK_SETUP; // Transition to network setup
        currentNetworkState = NetworkState::DISCONNECTED; // Ensure clean state
        return;
      }
    }
    break;
  }

  case GameState::NETWORK_SETUP: {
    btnHostGame.active = false;
    btnJoinGame.active = false;
    btnConnect.active = false;
    btnStartOnlineGame.active = false;

    // Handle back to mode selection
    if (IsKeyPressed(KEY_ESCAPE)) {
      Disconnect(); // Clean up any partial connections
      currentGameState = GameState::MODE_SELECTION;
      return;
    }

    if (currentNetworkState == NetworkState::DISCONNECTED) {
      if (CheckCollisionPointRec(mouse, btnHostGame.rect)) {
        btnHostGame.active = true;
        if (mouseClicked) {
          StartHosting(); // Placeholder function
        }
      }
      if (CheckCollisionPointRec(mouse, btnJoinGame.rect)) {
        btnJoinGame.active = true;
        if (mouseClicked) {
          if (!isHost) {
            // Client mode, prepare for IP input
            currentNetworkState = NetworkState::CLIENT_CONNECTING;
            ipAddressInputBuffer = DEFAULT_HOST_IP; // Use configured IP
          }
        }
      }
    } else if (currentNetworkState == NetworkState::CLIENT_CONNECTING) {
      // Handle IP address input
      int key = GetCharPressed();
      bool ipChanged = false;
      while (key > 0) {
        if (((key >= 48) && (key <= 57)) || (key == 46)) { // Digits and dot
          if (ipAddressInputBuffer.length() < maxIpLength) {
            ipAddressInputBuffer += (char)key;
            ipChanged = true;
          }
        }
        key = GetCharPressed();
      }

      // OSK Input for IP
      // Position OSK at bottom
      oskChar = CheckOSKInput(screenHeight - 250, true, oskEnter, oskBackspace);
      if (oskChar && (ipAddressInputBuffer.length() < maxIpLength)) {
        ipAddressInputBuffer += oskChar;
        ipChanged = true;
      }

      if (IsKeyPressed(KEY_BACKSPACE) || oskBackspace) {
        if (!ipAddressInputBuffer.empty()) {
          ipAddressInputBuffer.pop_back();
          ipChanged = true;
        }
      }

      if (ipChanged) {
        TraceLog(LOG_INFO, "IP Input: %s", ipAddressInputBuffer.c_str());
      }

      if (CheckCollisionPointRec(mouse, btnConnect.rect)) {
        btnConnect.active = true;
        if (mouseClicked) {
          if (!ipAddressInputBuffer.empty()) {
            ConnectToHost(ipAddressInputBuffer); // Placeholder function
            currentMode = GameMode::TWO_PLAYER_NETWORK_CLIENT;
          }
        }
      }
      if (IsKeyPressed(KEY_ENTER) || oskEnter) { // Also allow enter to connect
        if (!ipAddressInputBuffer.empty()) {
          ConnectToHost(ipAddressInputBuffer);
          currentMode = GameMode::TWO_PLAYER_NETWORK_CLIENT;
        }
      }
    } else if (currentNetworkState == NetworkState::CONNECTED) {
      // If host, allow starting the game
      if (isHost) {
        if (CheckCollisionPointRec(mouse, btnStartOnlineGame.rect)) {
          btnStartOnlineGame.active = true;
          if (mouseClicked) {
            currentMode = GameMode::TWO_PLAYER_NETWORK_HOST;
            ResetGame(); // Host starts the game, which sends GAME_START to
                         // client
          }
        }
      }
      // Client just waits, no interactive buttons here.
    } else if (currentNetworkState == NetworkState::CONNECTION_FAILED) {
      // Allow user to acknowledge error and go back
      if (IsKeyPressed(KEY_ENTER) || IsMouseButtonPressed(MOUSE_LEFT_BUTTON)) {
        Disconnect(); // Ensure clean slate
        currentNetworkState = NetworkState::DISCONNECTED;
      }
    }
    break;
  }

  case GameState::PLAYING: {
    // --- Input for Pause Button ---
    btnPause.active = false; // Reset visual state for this frame
    if (CheckCollisionPointRec(mouse, btnPause.rect)) {
      btnPause.active = true;
      if (mouseClicked) {
        currentGameState = GameState::PAUSED; // Toggle to paused
      }
    }
    // Keyboard input for Pause (e.g., 'P' key)
    if (IsKeyPressed(KEY_P)) {
      currentGameState = GameState::PAUSED; // Toggle to paused
    }

    // --- Touch Controls (Shared for now, can be adapted for separate controls)
    // ---
    // Touch controls currently only affect P1, and only if P1 is not dead
    if (!logicPlayer1.isGameOver) {
      static bool leftPressed = false;
      static bool rightPressed = false;
      static bool rotatePressed = false;

      btnLeft.active = false;
      btnRight.active = false;
      btnRotate.active = false;
      btnDrop.active = false;

      if (IsMouseButtonDown(MOUSE_LEFT_BUTTON)) {
        if (CheckCollisionPointRec(mouse, btnLeft.rect))
          btnLeft.active = true;
        if (CheckCollisionPointRec(mouse, btnRight.rect))
          btnRight.active = true;
        if (CheckCollisionPointRec(mouse, btnRotate.rect))
          btnRotate.active = true;
        if (CheckCollisionPointRec(mouse, btnDrop.rect))
          btnDrop.active = true;
      }

      if (btnLeft.active && !leftPressed) {
        logicPlayer1.Move(-1, 0);
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("MOVE_LR;DIR:-1"); // Send event for P1
        }
      }
      if (btnRight.active && !rightPressed) {
        logicPlayer1.Move(1, 0);
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("MOVE_LR;DIR:1"); // Send event for P1
        }
      }
      if (btnRotate.active && !rotatePressed) {
        logicPlayer1.Rotate();
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("ROTATE"); // Send event for P1
        }
      }
      if (btnDrop.active) { // Touch soft drop is continuous
        logicPlayer1.Move(0, 1);
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("MOVE_DOWN"); // Send event for P1
        }
      }

      // Update static states for touch buttons
      leftPressed = btnLeft.active;
      rightPressed = btnRight.active;
      rotatePressed = btnRotate.active;
    }
    // --- End Touch Controls ---

    // Handle keyboard input for Player 1 (local player)
    HandlePlayerInput(logicPlayer1, 1, dasDelay, dasRate, dasTimerP1,
                      lastMoveDirP1, lastSpawnCounterP1, waitForDownReleaseP1);

    // Handle keyboard input for Player 2 if in local multiplayer mode
    if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
      HandlePlayerInput(logicPlayer2, 2, dasDelay, dasRate, dasTimerP2,
                        lastMoveDirP2, lastSpawnCounterP2,
                        waitForDownReleaseP2);
    }
    // In network mode, logicPlayer2's state is updated by network messages, not
    // local input.
    break;
  }

  case GameState::PAUSED: {
    // --- Input for Pause Button (to unpause) ---
    btnPause.active = false; // Reset visual state for this frame
    if (CheckCollisionPointRec(mouse, btnPause.rect)) {
      btnPause.active = true;
      if (mouseClicked) {
        currentGameState = GameState::PLAYING; // Toggle back to playing
      }
    }
    // Keyboard input for Pause (e.g., 'P' key)
    if (IsKeyPressed(KEY_P)) {
      currentGameState = GameState::PLAYING; // Toggle back to playing
    }
    // No other game input is processed when paused
    break;
  }

  case GameState::GAME_OVER: {
    // No specific game input here; restart is handled globally.
    break;
  }
  } // End switch (currentGameState)
}

// Draw the On-Screen Keyboard
void Game::DrawOSK(int startY, bool isIpMode) {
  const char *keys =
      isIpMode ? "1234567890." : "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890";
  int btnSize = 40;
  int gap = 5;
  int keysPerRow = 10;
  int currentX = (screenWidth - (keysPerRow * (btnSize + gap))) / 2;
  int currentY = startY;

  // Draw Character Keys
  for (int i = 0; keys[i] != '\0'; i++) {
    Rectangle btnRect = {(float)currentX, (float)currentY, (float)btnSize,
                         (float)btnSize};
    DrawRectangleRec(btnRect, LIGHTGRAY);
    DrawRectangleLinesEx(btnRect, 2, DARKGRAY);

    char text[2] = {keys[i], '\0'};
    DrawText(text, btnRect.x + 10, btnRect.y + 5, 30, BLACK);

    currentX += btnSize + gap;
    if ((i + 1) % keysPerRow == 0) {
      currentX = (screenWidth - (keysPerRow * (btnSize + gap))) / 2;
      currentY += btnSize + gap;
    }
  }

  // New Row for Special Keys
  currentY += btnSize + gap;
  int specialBtnWidth = 100;
  currentX = (screenWidth - (2 * specialBtnWidth + gap)) / 2;

  // Backspace
  Rectangle bsRect = {(float)currentX, (float)currentY, (float)specialBtnWidth,
                      (float)btnSize};
  DrawRectangleRec(bsRect, ORANGE);
  DrawRectangleLinesEx(bsRect, 2, DARKGRAY);
  DrawText("DEL", bsRect.x + 20, bsRect.y + 10, 20, WHITE);

  currentX += specialBtnWidth + gap;

  // Enter
  Rectangle enterRect = {(float)currentX, (float)currentY,
                         (float)specialBtnWidth, (float)btnSize};
  DrawRectangleRec(enterRect, GREEN);
  DrawRectangleLinesEx(enterRect, 2, DARKGRAY);
  DrawText("ENTER", enterRect.x + 15, enterRect.y + 10, 20, WHITE);
}

// Check Input for On-Screen Keyboard
char Game::CheckOSKInput(int startY, bool isIpMode, bool &outEnter,
                         bool &outBackspace) {
  outEnter = false;
  outBackspace = false;

  if (!IsMouseButtonPressed(MOUSE_LEFT_BUTTON))
    return 0;
  Vector2 mouse = GetMousePosition();

  const char *keys =
      isIpMode ? "1234567890." : "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890";
  int btnSize = 40;
  int gap = 5;
  int keysPerRow = 10;
  int currentX = (screenWidth - (keysPerRow * (btnSize + gap))) / 2;
  int currentY = startY;

  // Check Character Keys
  for (int i = 0; keys[i] != '\0'; i++) {
    Rectangle btnRect = {(float)currentX, (float)currentY, (float)btnSize,
                         (float)btnSize};
    if (CheckCollisionPointRec(mouse, btnRect)) {
      return keys[i];
    }

    currentX += btnSize + gap;
    if ((i + 1) % keysPerRow == 0) {
      currentX = (screenWidth - (keysPerRow * (btnSize + gap))) / 2;
      currentY += btnSize + gap;
    }
  }

  // Check Special Keys
  currentY += btnSize + gap;
  int specialBtnWidth = 100;
  currentX = (screenWidth - (2 * specialBtnWidth + gap)) / 2;

  // Backspace
  Rectangle bsRect = {(float)currentX, (float)currentY, (float)specialBtnWidth,
                      (float)btnSize};
  if (CheckCollisionPointRec(mouse, bsRect)) {
    outBackspace = true;
    return 0;
  }

  currentX += specialBtnWidth + gap;

  // Enter
  Rectangle enterRect = {(float)currentX, (float)currentY,
                         (float)specialBtnWidth, (float)btnSize};
  if (CheckCollisionPointRec(mouse, enterRect)) {
    outEnter = true;
    return 0;
  }

  return 0;
}

void Game::Update() {
  HandleInput(); // Always handle input to check for state transitions,
                 // restart, and pause

  // Process network events regardless of game state, as connection can happen
  // in NETWORK_SETUP
  ProcessNetworkEvents();

  // Only update game logic if in PLAYING state
  if (currentGameState == GameState::PLAYING) {
    // Only update P1 logic if P1 is not yet game over
    if (!logicPlayer1.isGameOver) {
      int prevSpawnCounter = logicPlayer1.spawnCounter;

      gravityTimerP1 += GetFrameTime();
      if (gravityTimerP1 >= gravityInterval) {
        logicPlayer1.Tick();
        gravityTimerP1 = 0.0f;
        // In network mode, P1 (local player) sends its gravity-induced moves
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent(
              "MOVE_DOWN"); // Send automatic gravity tick as MOVE_DOWN
        }
      }

      // Check if a piece was locked (spawnCounter increased)
      if (logicPlayer1.spawnCounter > prevSpawnCounter) {
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          // Send SYNC_STATE with full board, score, and next piece
          std::string boardStr = "";
          for (int r = 0; r < BOARD_HEIGHT; r++) {
            for (int c = 0; c < BOARD_WIDTH; c++) {
              boardStr += std::to_string(logicPlayer1.board.GetCell(r, c));
            }
          }
          SendGameEvent(NetworkProtocol::SerializeSyncState(
              logicPlayer1.score, (int)logicPlayer1.nextPiece.type, boardStr));
        }
      }
    }

    // Only update P2 logic if in 2-player LOCAL mode and P2 is not yet game
    // over
    if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
      if (!logicPlayer2.isGameOver) {
        gravityTimerP2 += GetFrameTime();
        if (gravityTimerP2 >= gravityInterval) {
          logicPlayer2.Tick();
          gravityTimerP2 = 0.0f;
        }
      }
    }
    // In network modes (TWO_PLAYER_NETWORK_HOST or
    // TWO_PLAYER_NETWORK_CLIENT), logicPlayer2 represents the remote player.
    // Its state should be updated solely by received network events (e.g.,
    // MOVE_LR, ROTATE, MOVE_DOWN) from the remote player's client, not by
    // local gravity ticks. Therefore, the block that previously ran
    // logicPlayer2.Tick() for network modes has been removed to prevent
    // desynchronization.

    // --- Game Over Check ---
    if (currentMode == GameMode::SINGLE_PLAYER) {
      if (logicPlayer1.isGameOver) {
        currentGameState = GameState::GAME_OVER;
        winnerName = playerName; // In single player, it's always P1
      }
    } else if (currentMode == GameMode::TWO_PLAYER_LOCAL ||
               currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
               currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
      // Update individual player dead status
      if (logicPlayer1.isGameOver && !player1IsDead) {
        player1IsDead = true;
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("PLAYER_DEAD;ID:1"); // Notify remote player
        }
      }
      if (logicPlayer2.isGameOver && !player2IsDead) {
        player2IsDead = true;
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent("PLAYER_DEAD;ID:2"); // Notify remote player
        }
      }

      // If both players are dead, transition to GAME_OVER and determine
      // winner
      if (player1IsDead && player2IsDead) {
        currentGameState = GameState::GAME_OVER;
        if (logicPlayer1.score > logicPlayer2.score) {
          winnerName = playerName;
        } else if (logicPlayer2.score > logicPlayer1.score) {
          winnerName = remotePlayerName; // Use remote player's name for P2
        } else {
          winnerName = "It's a Tie!";
        }
        // Send final scores for network mode
        if (currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
            currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
          SendGameEvent(TextFormat("GAME_OVER;P1_SCORE:%d;P2_SCORE:%d",
                                   logicPlayer1.score, logicPlayer2.score));
        }
      }
    }
  }
}

void Game::DrawControls() {
  Button *btns[] = {&btnLeft, &btnRight, &btnRotate, &btnDrop};
  for (auto b : btns) {
    DrawRectangleRec(b->rect, b->active ? Fade(b->color, 0.5f) : b->color);
    DrawRectangleLinesEx(b->rect, 2, DARKGRAY);
    if (b->text == "^" || b->text == "v") {
      const char *symbol = "<";
      float rotation = (b->text == "^") ? 90.0f : -90.0f;

      float fSize = 30;
      Font font = GetFontDefault();
      Vector2 textSize = MeasureTextEx(font, symbol, fSize, 1);
      Vector2 position = {b->rect.x + b->rect.width / 2,
                          b->rect.y + b->rect.height / 2};
      Vector2 origin = {textSize.x / 2, textSize.y / 2};

      DrawTextPro(font, symbol, position, origin, rotation, fSize, 1, WHITE);
    } else {
      DrawText(b->text.c_str(),
               b->rect.x +
                   (b->rect.width / 2 - MeasureText(b->text.c_str(), 30) / 2),
               b->rect.y + (b->rect.height / 2 - 15), 30, WHITE);
    }
  }
}

void Game::DrawPlayerBoard(const Logic &logic, int boardOffsetX,
                           int boardOffsetY) {
  // 1. Board Background
  DrawRectangle(boardOffsetX, boardOffsetY, BOARD_WIDTH_PX, BOARD_HEIGHT_PX,
                DARKGRAY);

  // 2. Static Grid (Locked Pieces)
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      int x = boardOffsetX + j * cellSize;
      int y = boardOffsetY + i * cellSize;

      if (logic.board.GetCell(i, j) != 0) {
        DrawRectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, RED);
      } else {
        DrawRectangleLines(x, y, cellSize, cellSize, Fade(LIGHTGRAY, 0.1f));
      }
    }
  }

  // 3. Active Piece (Current)
  Piece p = logic.currentPiece;
  if (p.type != PieceType::NONE) {
    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(p.rotation, i, bx, by);
      int worldX = boardOffsetX + (p.x + bx) * cellSize;
      int worldY = boardOffsetY + (p.y + by) * cellSize;

      DrawRectangle(worldX + 1, worldY + 1, cellSize - 2, cellSize - 2, GREEN);
    }
  }

  // 4. Board Border
  DrawRectangleLines(boardOffsetX, boardOffsetY, BOARD_WIDTH_PX,
                     BOARD_HEIGHT_PX, WHITE);
}

void Game::DrawPlayerNextPiece(const Logic &logic, int previewX, int previewY) {
  int previewSize = 6 * cellSize; // The preview box is 6 cells by 6 cells

  // Draw Box
  DrawText("NEXT", previewX, previewY - 30, 20, WHITE);
  DrawRectangle(previewX, previewY, previewSize, previewSize, BLACK);
  DrawRectangleLines(previewX, previewY, previewSize, previewSize, WHITE);

  // Draw Piece inside box
  Piece p = logic.nextPiece;
  if (p.type != PieceType::NONE) {
    // 1. Find the bounding box of the piece (min/max bx, by) for rotation 0
    int minBx = 999, maxBx = -999, minBy = 999, maxBy = -999;
    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(0, i, bx, by); // Use rotation 0 for preview
      minBx = std::min(minBx, bx);
      maxBx = std::max(maxBx, bx);
      minBy = std::min(minBy, by);
      maxBy = std::max(maxBy, by);
    }

    // 2. Calculate the dimensions of the piece in blocks and pixels
    int pieceWidthBlocks = maxBx - minBx + 1;
    int pieceHeightBlocks = maxBy - minBy + 1;
    int piecePixelWidth = pieceWidthBlocks * cellSize;
    int piecePixelHeight = pieceHeightBlocks * cellSize;

    // 3. Calculate the top-left corner of the piece's bounding box within the
    // preview frame This positions the entire piece's visual bounding box
    // centered within the preview box.
    int targetPieceStartX = previewX + (previewSize - piecePixelWidth) / 2;
    int targetPieceStartY = previewY + (previewSize - piecePixelHeight) / 2;

    // 4. Calculate the effective "origin" (drawOriginX, drawOriginY) for the
    // piece's internal block coordinates (bx, by) The piece's blocks are
    // drawn at (drawOriginX + bx * cellSize, drawOriginY + by * cellSize). To
    // align the piece's minimum block (minBx, minBy) with targetPieceStartX,
    // targetPieceStartY: drawOriginX + minBx * cellSize = targetPieceStartX
    // => drawOriginX = targetPieceStartX - minBx * cellSize drawOriginY +
    // minBy * cellSize = targetPieceStartY  =>  drawOriginY =
    // targetPieceStartY - minBy
    // * cellSize
    int drawOriginX = targetPieceStartX - minBx * cellSize;
    int drawOriginY = targetPieceStartY - minBy * cellSize;

    // 5. Draw each block of the next piece using the calculated origin
    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(0, i, bx, by); // Use rotation 0 for preview

      int drawX = drawOriginX + (bx * cellSize);
      int drawY = drawOriginY + (by * cellSize);

      DrawRectangle(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2, GOLD);
    }
  }
}

void Game::DrawPlayerScore(const Logic &logic, int uiAreaX, int &currentY,
                           const std::string &name) {
  // Display player name
  DrawText(TextFormat("PLAYER: %s", name.c_str()), uiAreaX, currentY, 20,
           WHITE);
  currentY += 30; // Move down for score

  // Display the score
  DrawText(TextFormat("SCORE: %d", logic.score), uiAreaX, currentY, 20, WHITE);
  currentY += 30; // Move down for next element
}

void Game::Draw() {
  ClearBackground(RAYWHITE); // Clear the entire screen
  DrawRectangle(0, 0, screenWidth, screenHeight, BLACK); // Black background

  int btnTextFontSize = 30;

  // --- Draw global buttons (Restart, Pause, Change Name) ---
  int btnVerticalGap = 10; // Defined here for use in dynamic layouts in Draw
  // Restart button is always drawn, but only active in certain states
  DrawRectangleRec(btnRestart.rect, btnRestart.active
                                        ? Fade(btnRestart.color, 0.5f)
                                        : btnRestart.color);
  DrawRectangleLinesEx(btnRestart.rect, 2, DARKGRAY);
  int btnTextWidth = MeasureText(btnRestart.text.c_str(), btnTextFontSize);
  DrawText(btnRestart.text.c_str(),
           btnRestart.rect.x + (btnRestart.rect.width / 2 - btnTextWidth / 2),
           btnRestart.rect.y +
               (btnRestart.rect.height / 2 - (btnTextFontSize / 2)),
           btnTextFontSize, WHITE);

  // Draw Pause button (only if game is playing or paused)
  if (currentGameState == GameState::PLAYING ||
      currentGameState == GameState::PAUSED) {
    DrawRectangleRec(btnPause.rect, btnPause.active ? Fade(btnPause.color, 0.5f)
                                                    : btnPause.color);
    DrawRectangleLinesEx(btnPause.rect, 2, DARKGRAY);
    btnTextWidth =
        MeasureText(btnPause.text.c_str(), btnTextFontSize); // Recalculate
    DrawText(btnPause.text.c_str(),
             btnPause.rect.x + (btnPause.rect.width / 2 - btnTextWidth / 2),
             btnPause.rect.y +
                 (btnPause.rect.height / 2 - (btnTextFontSize / 2)),
             btnTextFontSize, WHITE);
  }

  // Draw Change Name button (only if NOT in TITLE_SCREEN, MODE_SELECTION,
  // NETWORK_SETUP)
  if (currentGameState != GameState::TITLE_SCREEN &&
      currentGameState != GameState::MODE_SELECTION &&
      currentGameState != GameState::NETWORK_SETUP) {
    DrawRectangleRec(btnChangeName.rect, btnChangeName.active
                                             ? Fade(btnChangeName.color, 0.5f)
                                             : btnChangeName.color);
    DrawRectangleLinesEx(btnChangeName.rect, 2, DARKGRAY);
    btnTextWidth = MeasureText(btnChangeName.text.c_str(), btnTextFontSize);
    DrawText(btnChangeName.text.c_str(),
             btnChangeName.rect.x +
                 (btnChangeName.rect.width / 2 - btnTextWidth / 2),
             btnChangeName.rect.y +
                 (btnChangeName.rect.height / 2 - (btnTextFontSize / 2)),
             btnTextFontSize, WHITE);
  }

  // --- Draw UI elements based on GameState and GameMode ---
  switch (currentGameState) {
  case GameState::TITLE_SCREEN: {
    // Dark overlay for the title screen
    DrawRectangle(0, 0, screenWidth, screenHeight, Fade(BLACK, 0.8f));

    // Draw Build Version
    DrawText(BUILD_VERSION.c_str(), 10, 10, 20, GRAY);

    // Title text
    const char *titleText = "TETRIS BATTLE";
    int titleFontSize = 60;
    int titleWidth = MeasureText(titleText, titleFontSize);
    DrawText(titleText, (screenWidth - titleWidth) / 2, screenHeight / 4,
             titleFontSize, GOLD);

    // Prompt for name
    const char *promptText =
        (playerNameInputBuffer.empty() && playerName == "Player1")
            ? "ENTER YOUR NAME:"
            : "EDIT YOUR NAME:";
    int promptFontSize = 30;
    int promptWidth = MeasureText(promptText, promptFontSize);
    DrawText(promptText, (screenWidth - promptWidth) / 2, screenHeight / 2 - 40,
             promptFontSize, WHITE);

    // Draw input buffer and blinking cursor
    int inputFontSize = 30;
    std::string displayInput = playerNameInputBuffer;
    if (showCursor) {
      displayInput += "_";
    }
    int inputWidth = MeasureText(displayInput.c_str(), inputFontSize);
    DrawText(displayInput.c_str(), (screenWidth - inputWidth) / 2,
             screenHeight / 2, inputFontSize, WHITE);

    // Instructions
    const char *enterPrompt = "PRESS ENTER OR USE KEYBOARD BELOW";
    int enterPromptFontSize = 20;
    int enterPromptWidth = MeasureText(enterPrompt, enterPromptFontSize);
    DrawText(enterPrompt, (screenWidth - enterPromptWidth) / 2,
             screenHeight / 2 + 60, enterPromptFontSize, LIGHTGRAY);

    // Draw On-Screen Keyboard
    DrawOSK(screenHeight / 2 + 100, false);

    break;
  }

  case GameState::MODE_SELECTION: {
    DrawRectangle(0, 0, screenWidth, screenHeight, Fade(BLACK, 0.8f));

    const char *modePrompt = "SELECT GAME MODE:";
    int modePromptFontSize = 40;
    int modePromptWidth = MeasureText(modePrompt, modePromptFontSize);
    DrawText(modePrompt, (screenWidth - modePromptWidth) / 2, screenHeight / 4,
             modePromptFontSize, WHITE);

    // Draw Single Player button
    DrawRectangleRec(btnSinglePlayer.rect,
                     btnSinglePlayer.active ? Fade(btnSinglePlayer.color, 0.5f)
                                            : btnSinglePlayer.color);
    DrawRectangleLinesEx(btnSinglePlayer.rect, 2, DARKGRAY);
    btnTextWidth = MeasureText(btnSinglePlayer.text.c_str(), btnTextFontSize);
    DrawText(btnSinglePlayer.text.c_str(),
             btnSinglePlayer.rect.x +
                 (btnSinglePlayer.rect.width / 2 - btnTextWidth / 2),
             btnSinglePlayer.rect.y +
                 (btnSinglePlayer.rect.height / 2 - (btnTextFontSize / 2)),
             btnTextFontSize, WHITE);

    // Draw Two Player Local button
    DrawRectangleRec(btnTwoPlayerLocal.rect,
                     btnTwoPlayerLocal.active
                         ? Fade(btnTwoPlayerLocal.color, 0.5f)
                         : btnTwoPlayerLocal.color);
    DrawRectangleLinesEx(btnTwoPlayerLocal.rect, 2, DARKGRAY);
    btnTextWidth = MeasureText(btnTwoPlayerLocal.text.c_str(), btnTextFontSize);
    DrawText(btnTwoPlayerLocal.text.c_str(),
             btnTwoPlayerLocal.rect.x +
                 (btnTwoPlayerLocal.rect.width / 2 - btnTextWidth / 2),
             btnTwoPlayerLocal.rect.y +
                 (btnTwoPlayerLocal.rect.height / 2 - (btnTextFontSize / 2)),
             btnTextFontSize, WHITE);

    // Draw Two Player Network button
    DrawRectangleRec(btnTwoPlayerNetwork.rect,
                     btnTwoPlayerNetwork.active
                         ? Fade(btnTwoPlayerNetwork.color, 0.5f)
                         : btnTwoPlayerNetwork.color);
    DrawRectangleLinesEx(btnTwoPlayerNetwork.rect, 2, DARKGRAY);
    btnTextWidth =
        MeasureText(btnTwoPlayerNetwork.text.c_str(), btnTextFontSize);
    DrawText(btnTwoPlayerNetwork.text.c_str(),
             btnTwoPlayerNetwork.rect.x +
                 (btnTwoPlayerNetwork.rect.width / 2 - btnTextWidth / 2),
             btnTwoPlayerNetwork.rect.y +
                 (btnTwoPlayerNetwork.rect.height / 2 - (btnTextFontSize / 2)),
             btnTextFontSize, WHITE);
    break;
  }

  case GameState::NETWORK_SETUP: {
    DrawRectangle(0, 0, screenWidth, screenHeight, Fade(BLACK, 0.8f));

    const char *networkPrompt = "NETWORK PLAY:";
    int networkPromptFontSize = 40;
    int networkPromptWidth = MeasureText(networkPrompt, networkPromptFontSize);
    DrawText(networkPrompt, (screenWidth - networkPromptWidth) / 2,
             screenHeight / 4, networkPromptFontSize, WHITE);

    int currentBtnY =
        screenHeight / 2 - btnTwoPlayerNetwork.rect.height - btnVerticalGap;
    int btnX = (screenWidth - btnTwoPlayerNetwork.rect.width) / 2;

    if (currentNetworkState == NetworkState::DISCONNECTED) {
      // Position and draw Host Game button
      btnHostGame.rect.x = btnX;
      btnHostGame.rect.y = currentBtnY;
      DrawRectangleRec(btnHostGame.rect, btnHostGame.active
                                             ? Fade(btnHostGame.color, 0.5f)
                                             : btnHostGame.color);
      DrawRectangleLinesEx(btnHostGame.rect, 2, DARKGRAY);
      btnTextWidth = MeasureText(btnHostGame.text.c_str(), btnTextFontSize);
      DrawText(btnHostGame.text.c_str(),
               btnHostGame.rect.x +
                   (btnHostGame.rect.width / 2 - btnTextWidth / 2),
               btnHostGame.rect.y +
                   (btnHostGame.rect.height / 2 - (btnTextFontSize / 2)),
               btnTextFontSize, WHITE);

      currentBtnY += btnHostGame.rect.height + btnVerticalGap;

      // Position and draw Join Game button
      btnJoinGame.rect.x = btnX;
      btnJoinGame.rect.y = currentBtnY;
      DrawRectangleRec(btnJoinGame.rect, btnJoinGame.active
                                             ? Fade(btnJoinGame.color, 0.5f)
                                             : btnJoinGame.color);
      DrawRectangleLinesEx(btnJoinGame.rect, 2, DARKGRAY);
      btnTextWidth = MeasureText(btnJoinGame.text.c_str(), btnTextFontSize);
      DrawText(btnJoinGame.text.c_str(),
               btnJoinGame.rect.x +
                   (btnJoinGame.rect.width / 2 - btnTextWidth / 2),
               btnJoinGame.rect.y +
                   (btnJoinGame.rect.height / 2 - (btnTextFontSize / 2)),
               btnTextFontSize, WHITE);
    } else if (currentNetworkState == NetworkState::HOSTING_WAITING) {
      std::string statusText = "HOSTING... Waiting for client on IP:";
      int statusFontSize = 30;
      int statusWidth = MeasureText(statusText.c_str(), statusFontSize);
      DrawText(statusText.c_str(), (screenWidth - statusWidth) / 2,
               currentBtnY - 50, statusFontSize, WHITE);

      std::string ipText = currentIpAddress + ":" + std::to_string(networkPort);
      int ipFontSize = 40;
      int ipWidth = MeasureText(ipText.c_str(), ipFontSize);
      DrawText(ipText.c_str(), (screenWidth - ipWidth) / 2, currentBtnY,
               ipFontSize, GOLD);

      DrawText("Press ESC to cancel",
               (screenWidth - MeasureText("Press ESC to cancel", 20)) / 2,
               screenHeight - 100, 20, LIGHTGRAY);

    } else if (currentNetworkState == NetworkState::CLIENT_CONNECTING) {
      std::string promptText = "ENTER HOST IP:";
      int promptFontSize = 30;
      int promptWidth = MeasureText(promptText.c_str(), promptFontSize);
      DrawText(promptText.c_str(), (screenWidth - promptWidth) / 2,
               currentBtnY - 50, promptFontSize, WHITE);

      std::string displayInput = ipAddressInputBuffer;
      if (showCursor) {
        displayInput += "_";
      }
      int inputFontSize = 30;
      int inputWidth = MeasureText(displayInput.c_str(), inputFontSize);
      DrawText(displayInput.c_str(), (screenWidth - inputWidth) / 2,
               currentBtnY, inputFontSize, WHITE);

      currentBtnY += 50 + btnVerticalGap; // Adjust button position below input

      // Draw OSK for IP
      DrawOSK(screenHeight - 250, true);
      // Adjust Connect button to separate from OSK
      currentBtnY = screenHeight - 250 - 60;

      // Position and draw Connect button
      btnConnect.rect.x = btnX;
      btnConnect.rect.y = currentBtnY;
      DrawRectangleRec(btnConnect.rect, btnConnect.active
                                            ? Fade(btnConnect.color, 0.5f)
                                            : btnConnect.color);
      DrawRectangleLinesEx(btnConnect.rect, 2, DARKGRAY);
      btnTextWidth = MeasureText(btnConnect.text.c_str(), btnTextFontSize);
      DrawText(btnConnect.text.c_str(),
               btnConnect.rect.x +
                   (btnConnect.rect.width / 2 - btnTextWidth / 2),
               btnConnect.rect.y +
                   (btnConnect.rect.height / 2 - (btnTextFontSize / 2)),
               btnTextFontSize, WHITE);

      DrawText("Press ESC to cancel",
               (screenWidth - MeasureText("Press ESC to cancel", 20)) / 2,
               screenHeight - 100, 20, LIGHTGRAY);

    } else if (currentNetworkState == NetworkState::CONNECTED) {
      std::string statusText;
      if (isHost) {
        statusText = "CLIENT CONNECTED: " + remotePlayerName;
        int statusFontSize = 30;
        int statusWidth = MeasureText(statusText.c_str(), statusFontSize);
        DrawText(statusText.c_str(), (screenWidth - statusWidth) / 2,
                 currentBtnY - 50, statusFontSize, WHITE);

        // Host can start the game
        btnStartOnlineGame.rect.x = btnX;
        btnStartOnlineGame.rect.y = currentBtnY;
        DrawRectangleRec(btnStartOnlineGame.rect,
                         btnStartOnlineGame.active
                             ? Fade(btnStartOnlineGame.color, 0.5f)
                             : btnStartOnlineGame.color);
        DrawRectangleLinesEx(btnStartOnlineGame.rect, 2, DARKGRAY);
        btnTextWidth =
            MeasureText(btnStartOnlineGame.text.c_str(), btnTextFontSize);
        DrawText(
            btnStartOnlineGame.text.c_str(),
            btnStartOnlineGame.rect.x +
                (btnStartOnlineGame.rect.width / 2 - btnTextWidth / 2),
            btnStartOnlineGame.rect.y +
                (btnStartOnlineGame.rect.height / 2 - (btnTextFontSize / 2)),
            btnTextFontSize, WHITE);
      } else {
        statusText = "CONNECTED TO HOST: " + currentIpAddress;
        int statusFontSize = 30;
        int statusWidth = MeasureText(statusText.c_str(), statusFontSize);
        DrawText(statusText.c_str(), (screenWidth - statusWidth) / 2,
                 currentBtnY - 50, statusFontSize, WHITE);
        DrawText("Waiting for host to start game...",
                 (screenWidth -
                  MeasureText("Waiting for host to start game...", 25)) /
                     2,
                 currentBtnY + 50, 25, LIGHTGRAY);
      }
      DrawText("Press ESC to disconnect",
               (screenWidth - MeasureText("Press ESC to disconnect", 20)) / 2,
               screenHeight - 100, 20, LIGHTGRAY);
    } else if (currentNetworkState == NetworkState::CONNECTION_FAILED) {
      // Draw Error Message
      const char *errorTitle = "CONNECTION ERROR";
      int titleWidth = MeasureText(errorTitle, 40);
      DrawText(errorTitle, (screenWidth - titleWidth) / 2,
               screenHeight / 2 - 80, 40, RED);

      int errWidth = MeasureText(networkErrorMessage.c_str(), 30);
      DrawText(networkErrorMessage.c_str(), (screenWidth - errWidth) / 2,
               screenHeight / 2 - 20, 30, ORANGE);

      const char *retryText = "Press ENTER or CLICK to Retry/Back";
      int retryWidth = MeasureText(retryText, 20);
      DrawText(retryText, (screenWidth - retryWidth) / 2, screenHeight / 2 + 50,
               20, LIGHTGRAY);
    }
    break;
  }

  case GameState::PLAYING:
  case GameState::PAUSED:
  case GameState::GAME_OVER: {
    // Always draw touch controls in these states
    DrawControls();

    // Determine P1 Board Position
    int p1BoardX = BOARD_OFFSET_X_P1;
    if (currentMode == GameMode::SINGLE_PLAYER) {
      // Center the board
      p1BoardX = (screenWidth - BOARD_WIDTH_PX) / 2;
    }

    // --- Draw Player 1's board and UI ---
    DrawPlayerBoard(logicPlayer1, p1BoardX, BOARD_OFFSET_Y);
    int p1_ui_x = p1BoardX + BOARD_WIDTH_PX + 20;
    int p1_ui_y = BOARD_OFFSET_Y;
    DrawPlayerNextPiece(logicPlayer1, p1_ui_x, p1_ui_y);
    p1_ui_y += (6 * cellSize) + 20; // Below next piece preview
    DrawPlayerScore(logicPlayer1, p1_ui_x, p1_ui_y, playerName);

    // Overlay for P1 if dead or paused
    if (currentGameState == GameState::PAUSED) {
      DrawRectangle(p1BoardX, BOARD_OFFSET_Y, BOARD_WIDTH_PX, BOARD_HEIGHT_PX,
                    Fade(BLACK, 0.7f));
    } else if (currentMode == GameMode::SINGLE_PLAYER &&
               logicPlayer1.isGameOver) {
      // For single player, the full GAME OVER screen will handle this
      // No individual board overlay needed here as it will be covered by full
      // screen
    } else if ((currentMode == GameMode::TWO_PLAYER_LOCAL ||
                currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
                currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) &&
               logicPlayer1.isGameOver) {
      DrawRectangle(p1BoardX, BOARD_OFFSET_Y, BOARD_WIDTH_PX, BOARD_HEIGHT_PX,
                    Fade(BLACK, 0.7f));
      const char *p1GameOverText = "GAME OVER";
      int textFontSize = 40; // Smaller for individual board
      int textWidth = MeasureText(p1GameOverText, textFontSize);
      DrawText(p1GameOverText, p1BoardX + (BOARD_WIDTH_PX - textWidth) / 2,
               BOARD_OFFSET_Y + (BOARD_HEIGHT_PX / 2) - textFontSize / 2,
               textFontSize, RED);
    }

    // --- Draw Player 2's board and UI if in local multiplayer or network
    // mode
    // ---
    if (currentMode == GameMode::TWO_PLAYER_LOCAL ||
        currentMode == GameMode::TWO_PLAYER_NETWORK_HOST ||
        currentMode == GameMode::TWO_PLAYER_NETWORK_CLIENT) {
      DrawPlayerBoard(logicPlayer2, BOARD_OFFSET_X_P2, BOARD_OFFSET_Y);
      int p2_ui_x = BOARD_OFFSET_X_P2 + BOARD_WIDTH_PX + 20;
      int p2_ui_y = BOARD_OFFSET_Y;
      DrawPlayerNextPiece(logicPlayer2, p2_ui_x, p2_ui_y);
      p2_ui_y += (6 * cellSize) + 20; // Below next piece preview
      DrawPlayerScore(logicPlayer2, p2_ui_x, p2_ui_y,
                      remotePlayerName); // Use remotePlayerName for P2

      // Overlay for P2 if dead or paused
      if (currentGameState == GameState::PAUSED) {
        DrawRectangle(BOARD_OFFSET_X_P2, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                      BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
      } else if (logicPlayer2
                     .isGameOver) { // In 2-player mode, P2's own game over
        DrawRectangle(BOARD_OFFSET_X_P2, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                      BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
        const char *p2GameOverText = "GAME OVER";
        int textFontSize = 40;
        int textWidth = MeasureText(p2GameOverText, textFontSize);
        DrawText(p2GameOverText,
                 BOARD_OFFSET_X_P2 + (BOARD_WIDTH_PX - textWidth) / 2,
                 BOARD_OFFSET_Y + (BOARD_HEIGHT_PX / 2) - textFontSize / 2,
                 textFontSize, RED);
      }
    }

    // --- Central Overlays for PAUSED and overall GAME_OVER ---
    if (currentGameState == GameState::PAUSED) {
      // Draw "PAUSED" text centered over P1 board
      const char *pausedText = "PAUSED";
      int textFontSizePaused = 50;
      int textWidthPaused = MeasureText(pausedText, textFontSizePaused);
      int textX = p1BoardX + (BOARD_WIDTH_PX - textWidthPaused) / 2;
      int textY = BOARD_OFFSET_Y + (BOARD_HEIGHT_PX / 2) - textFontSizePaused;

      DrawText(pausedText, textX, textY, textFontSizePaused, WHITE);
    } else if (currentGameState == GameState::GAME_OVER) {
      // This is the *overall* GAME OVER, meaning both players are dead in
      // 2-player, or P1 in 1-player. Draw a full-screen overlay for final
      // game over message
      DrawRectangle(0, 0, screenWidth, screenHeight,
                    Fade(BLACK, 0.9f)); // Darker overlay over everything

      const char *gameOverText = "GAME OVER";
      int textFontSize = 60;
      int textWidth = MeasureText(gameOverText, textFontSize);
      DrawText(gameOverText, (screenWidth - textWidth) / 2, screenHeight / 3,
               textFontSize, RED);

      if (currentMode == GameMode::SINGLE_PLAYER) {
        std::string finalScoreDisplay =
            "FINAL SCORE: " + std::to_string(logicPlayer1.score);
        int scoreFontSize = 40;
        int scoreWidth = MeasureText(finalScoreDisplay.c_str(), scoreFontSize);
        DrawText(finalScoreDisplay.c_str(), (screenWidth - scoreWidth) / 2,
                 screenHeight / 3 + 80, scoreFontSize, GOLD);
      } else { // Two Player Local or Network
        std::string winnerDisplay = "WINNER: " + winnerName;
        if (winnerName == "It's a Tie!") {
          winnerDisplay = "It's a Tie!";
        }
        int winnerFontSize = 40;
        int winnerWidth = MeasureText(winnerDisplay.c_str(), winnerFontSize);
        DrawText(winnerDisplay.c_str(), (screenWidth - winnerWidth) / 2,
                 screenHeight / 3 + 80, winnerFontSize, GOLD);

        // Display scores for both players
        std::string p1ScoreDisplay =
            playerName + " Score: " + std::to_string(logicPlayer1.score);
        std::string p2ScoreDisplay =
            remotePlayerName + " Score: " + std::to_string(logicPlayer2.score);
        int individualScoreFontSize = 30;
        int p1ScoreWidth =
            MeasureText(p1ScoreDisplay.c_str(), individualScoreFontSize);
        int p2ScoreWidth =
            MeasureText(p2ScoreDisplay.c_str(), individualScoreFontSize);

        DrawText(p1ScoreDisplay.c_str(), (screenWidth - p1ScoreWidth) / 2,
                 screenHeight / 3 + 150, individualScoreFontSize, WHITE);
        DrawText(p2ScoreDisplay.c_str(), (screenWidth - p2ScoreWidth) / 2,
                 screenHeight / 3 + 190, individualScoreFontSize, WHITE);
      }

      // Prompt to restart
      const char *restartPrompt = "Press R or click RESTART to play again";
      int restartPromptFontSize = 25;
      int restartPromptWidth =
          MeasureText(restartPrompt, restartPromptFontSize);
      DrawText(restartPrompt, (screenWidth - restartPromptWidth) / 2,
               screenHeight - 100, restartPromptFontSize, LIGHTGRAY);
    }
    break;
  }
  } // End switch (currentGameState)

  // --- Debug: Visual Cursor for Touch Alignment ---
  Vector2 mousePos = GetMousePosition();
  DrawCircleV(mousePos, 10, Fade(RED, 0.5f));
  DrawText(TextFormat("Input: %0.0f,%0.0f", mousePos.x, mousePos.y),
           mousePos.x + 15, mousePos.y, 20, RED);
}