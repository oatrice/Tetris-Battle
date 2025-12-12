#include "game.h"
#include "raylib.h"  // For LoadFileText, SaveFileText
#include <algorithm> // Required for std::max
#include <vector>    // Required for std::vector in max initialization

Game::Game() {
  // Initialize game state to TITLE_SCREEN to prompt for player name
  currentGameState = GameState::TITLE_SCREEN;
  currentMode = GameMode::SINGLE_PLAYER; // Default to single player

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
  int currentY = BOARD_OFFSET_Y + 20; // Start below top of screen

  // Calculate required button width based on text to prevent overflow
  int btnTextFontSize = 30; // Matches the font size used in Draw()
  int restartTextWidth = MeasureText("Restart", btnTextFontSize);
  int pauseTextWidth = MeasureText("Pause", btnTextFontSize);
  int changeNameTextWidth = MeasureText("Change Name", btnTextFontSize);
  int singlePlayerTextWidth = MeasureText("1 Player", btnTextFontSize);
  int twoPlayerLocalTextWidth =
      MeasureText("2 Player (Local)", btnTextFontSize);

  // Choose the maximum width and add padding (e.g., 40px total padding)
  int btnWidth =
      std::max({restartTextWidth, pauseTextWidth, changeNameTextWidth,
                singlePlayerTextWidth, twoPlayerLocalTextWidth}) +
      40;

  int btnHeight = 40;
  int btnVerticalGap = 10;

  btnRestart = {
      {(float)UI_AREA_X, (float)currentY, (float)btnWidth, (float)btnHeight},
      DARKBLUE,
      "Restart",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnPause = {
      {(float)UI_AREA_X, (float)currentY, (float)btnWidth, (float)btnHeight},
      GOLD, // Color: GOLD as requested
      "Pause",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnChangeName = {
      {(float)UI_AREA_X, (float)currentY, (float)btnWidth, (float)btnHeight},
      PURPLE, // A distinct color for Change Name
      "Change Name",
      false};

  // Initialize Mode Selection Buttons (centered on screen initially)
  int modeBtnX = (screenWidth - btnWidth) / 2;
  int modeBtnY = screenHeight / 2 - btnHeight - btnVerticalGap;

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
}

Game::~Game() {}

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
  logicPlayer1.Reset(); // Resets board, score, and spawns a new piece
  gravityTimerP1 = 0.0f;
  dasTimerP1 = 0.0f;
  lastMoveDirP1 = 0;
  lastSpawnCounterP1 =
      logicPlayer1.spawnCounter; // Sync after logic.Reset() spawns a new piece
  waitForDownReleaseP1 = false;

  if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
    logicPlayer2.Reset();
    gravityTimerP2 = 0.0f;
    dasTimerP2 = 0.0f;
    lastMoveDirP2 = 0;
    lastSpawnCounterP2 = logicPlayer2.spawnCounter;
    waitForDownReleaseP2 = false;
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
  // --- Soft Drop Safety Logic ---
  // 1. Detect if a new piece has spawned since the last frame
  if (logic.spawnCounter != lastSpawnCounter) {
    lastSpawnCounter = logic.spawnCounter;
    // If KEY_DOWN is currently held, activate the safety flag
    if ((playerIndex == 1 && IsKeyDown(KEY_DOWN)) ||
        (playerIndex == 2 && IsKeyDown(KEY_S))) {
      waitForDownRelease = true;
    }
  }
  // 2. If the safety flag is active, check if KEY_DOWN has been released
  if (!((playerIndex == 1 && IsKeyDown(KEY_DOWN)) ||
        (playerIndex == 2 && IsKeyDown(KEY_S)))) {
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
  } else { // Player 2 uses WASD
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
    dasTimer = 0.0f;                       // Reset timer
    lastMoveDir = currentKeyboardMoveDir;
  }
  // If the same key is held down (DAS repeat)
  else if (currentKeyboardMoveDir != 0 &&
           currentKeyboardMoveDir == lastMoveDir) {
    dasTimer += GetFrameTime();
    while (dasTimer >= dasDelay) {
      logic.Move(lastMoveDir, 0);
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
    }
    // Soft Drop (continuous) - now includes soft drop safety check
    if (IsKeyDown(KEY_DOWN) && !waitForDownRelease) {
      logic.Move(0, 1);
    }
  } else { // Player 2
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
          currentGameState != GameState::MODE_SELECTION) {
        ResetGame();
        currentGameState =
            GameState::PLAYING; // After reset, always go to playing
        return; // Game reset, no further input processing this frame
      }
    }
  }

  // Keyboard input for Restart (e.g., 'R' key)
  if (IsKeyPressed(KEY_R)) {
    if (currentGameState != GameState::TITLE_SCREEN &&
        currentGameState != GameState::MODE_SELECTION) {
      ResetGame();
      currentGameState = GameState::PLAYING;
      return; // Game reset, no further input processing this frame
    }
  }

  // --- Global Input for Change Name Button ---
  // Only allow changing name if not already on the title screen
  if (currentGameState != GameState::TITLE_SCREEN &&
      currentGameState != GameState::MODE_SELECTION) {
    btnChangeName.active = false; // Reset visual state for this frame
    if (CheckCollisionPointRec(mouse, btnChangeName.rect)) {
      btnChangeName.active = true;
      if (mouseClicked) {
        // Transition to TITLE_SCREEN to change name
        currentGameState = GameState::TITLE_SCREEN;
        playerNameInputBuffer = playerName; // Pre-fill with current name
        return; // State changed, no further input processing this frame
      }
    }
    // Keyboard input for Change Name (e.g., 'N' key)
    if (IsKeyPressed(KEY_N)) {
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

    if (IsKeyPressed(KEY_BACKSPACE)) {
      if (!playerNameInputBuffer.empty()) {
        playerNameInputBuffer.pop_back();
      }
    }

    if (IsKeyPressed(KEY_ENTER)) {
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

    if (CheckCollisionPointRec(mouse, btnSinglePlayer.rect)) {
      btnSinglePlayer.active = true;
      if (mouseClicked) {
        currentMode = GameMode::SINGLE_PLAYER;
        ResetGame(); // Setup game for single player
        currentGameState = GameState::PLAYING;
        return;
      }
    }
    if (CheckCollisionPointRec(mouse, btnTwoPlayerLocal.rect)) {
      btnTwoPlayerLocal.active = true;
      if (mouseClicked) {
        currentMode = GameMode::TWO_PLAYER_LOCAL;
        ResetGame(); // Setup game for two players
        currentGameState = GameState::PLAYING;
        return;
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
      logicPlayer1.Move(-1, 0); // Touch controls currently affect P1
    }
    if (btnRight.active && !rightPressed) {
      logicPlayer1.Move(1, 0); // Touch controls currently affect P1
    }
    if (btnRotate.active && !rotatePressed) {
      logicPlayer1.Rotate(); // Touch controls currently affect P1
    }
    if (btnDrop.active) {      // Touch soft drop is continuous
      logicPlayer1.Move(0, 1); // Touch controls currently affect P1
    }

    // Update static states for touch buttons
    leftPressed = btnLeft.active;
    rightPressed = btnRight.active;
    rotatePressed = btnRotate.active;
    // --- End Touch Controls ---

    // Handle keyboard input for Player 1
    HandlePlayerInput(logicPlayer1, 1, dasDelay, dasRate, dasTimerP1,
                      lastMoveDirP1, lastSpawnCounterP1, waitForDownReleaseP1);

    // Handle keyboard input for Player 2 if in local multiplayer mode
    if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
      HandlePlayerInput(logicPlayer2, 2, dasDelay, dasRate, dasTimerP2,
                        lastMoveDirP2, lastSpawnCounterP2,
                        waitForDownReleaseP2);
    }
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

void Game::Update() {
  HandleInput(); // Always handle input to check for state transitions, restart,
                 // and pause

  // Only update game logic if in PLAYING state
  if (currentGameState == GameState::PLAYING) {
    // Gravity System for Player 1
    gravityTimerP1 += GetFrameTime();
    if (gravityTimerP1 >= gravityInterval) {
      logicPlayer1.Tick();
      gravityTimerP1 = 0.0f;
    }

    // Check for game over for Player 1
    if (logicPlayer1.isGameOver) {
      currentGameState = GameState::GAME_OVER;
    }

    // Gravity System for Player 2 if in local multiplayer mode
    if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
      gravityTimerP2 += GetFrameTime();
      if (gravityTimerP2 >= gravityInterval) {
        logicPlayer2.Tick();
        gravityTimerP2 = 0.0f;
      }
      // Check for game over for Player 2
      if (logicPlayer2.isGameOver) {
        currentGameState = GameState::GAME_OVER; // Consider more complex game
                                                 // over logic for 2 players
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
    // piece's internal block coordinates (bx, by) The piece's blocks are drawn
    // at (drawOriginX + bx * cellSize, drawOriginY + by * cellSize). To align
    // the piece's minimum block (minBx, minBy) with targetPieceStartX,
    // targetPieceStartY: drawOriginX + minBx * cellSize = targetPieceStartX  =>
    // drawOriginX = targetPieceStartX - minBx * cellSize drawOriginY + minBy *
    // cellSize = targetPieceStartY  =>  drawOriginY = targetPieceStartY - minBy
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

  // --- Draw global buttons (Restart, Pause, Change Name) ---
  int btnTextFontSize = 30;

  // Draw Restart button
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

  // Draw Change Name button (only if NOT in TITLE_SCREEN or MODE_SELECTION)
  if (currentGameState != GameState::TITLE_SCREEN &&
      currentGameState != GameState::MODE_SELECTION) {
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
    const char *enterPrompt = "PRESS ENTER TO CONTINUE";
    int enterPromptFontSize = 20;
    int enterPromptWidth = MeasureText(enterPrompt, enterPromptFontSize);
    DrawText(enterPrompt, (screenWidth - enterPromptWidth) / 2,
             screenHeight / 2 + 60, enterPromptFontSize, LIGHTGRAY);
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
    break;
  }

  case GameState::PLAYING:
  case GameState::PAUSED:
  case GameState::GAME_OVER: {
    // Always draw touch controls in these states
    DrawControls();

    // Draw Player 1's board and UI
    DrawPlayerBoard(logicPlayer1, BOARD_OFFSET_X_P1, BOARD_OFFSET_Y);
    int p1_ui_x = BOARD_OFFSET_X_P1 + BOARD_WIDTH_PX + 20;
    int p1_ui_y = BOARD_OFFSET_Y;
    DrawPlayerNextPiece(logicPlayer1, p1_ui_x, p1_ui_y);
    p1_ui_y += (6 * cellSize) + 20; // Below next piece preview
    DrawPlayerScore(logicPlayer1, p1_ui_x, p1_ui_y, playerName);

    if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
      // Draw Player 2's board and UI
      DrawPlayerBoard(logicPlayer2, BOARD_OFFSET_X_P2, BOARD_OFFSET_Y);
      int p2_ui_x = BOARD_OFFSET_X_P2 + BOARD_WIDTH_PX + 20;
      int p2_ui_y = BOARD_OFFSET_Y;
      DrawPlayerNextPiece(logicPlayer2, p2_ui_x, p2_ui_y);
      p2_ui_y += (6 * cellSize) + 20; // Below next piece preview
      DrawPlayerScore(logicPlayer2, p2_ui_x, p2_ui_y, "Player2");
    }

    // --- Overlays for PAUSED and GAME_OVER ---
    if (currentGameState == GameState::PAUSED) {
      // Draw semi-transparent black overlay over the board areas
      DrawRectangle(BOARD_OFFSET_X_P1, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                    BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
      if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
        DrawRectangle(BOARD_OFFSET_X_P2, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                      BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
      }

      // Draw "PAUSED" text centered over P1 board
      const char *pausedText = "PAUSED";
      int textFontSizePaused = 50;
      int textWidthPaused = MeasureText(pausedText, textFontSizePaused);
      int textX = BOARD_OFFSET_X_P1 + (BOARD_WIDTH_PX - textWidthPaused) / 2;
      int textY = BOARD_OFFSET_Y + (BOARD_HEIGHT_PX / 2) - textFontSizePaused;

      DrawText(pausedText, textX, textY, textFontSizePaused, WHITE);
    } else if (currentGameState == GameState::GAME_OVER) {
      // Draw semi-transparent black overlay over the board areas
      DrawRectangle(BOARD_OFFSET_X_P1, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                    BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
      if (currentMode == GameMode::TWO_PLAYER_LOCAL) {
        DrawRectangle(BOARD_OFFSET_X_P2, BOARD_OFFSET_Y, BOARD_WIDTH_PX,
                      BOARD_HEIGHT_PX, Fade(BLACK, 0.7f));
      }

      // Draw "GAME OVER" text centered over P1 board
      const char *gameOverText = "GAME OVER";
      int textFontSizeGameOver = 50;
      int textWidthGameOver = MeasureText(gameOverText, textFontSizeGameOver);
      int textX = BOARD_OFFSET_X_P1 + (BOARD_WIDTH_PX - textWidthGameOver) / 2;
      int textY = BOARD_OFFSET_Y + (BOARD_HEIGHT_PX / 2) -
                  textFontSizeGameOver; // Slightly above center

      DrawText(gameOverText, textX, textY, textFontSizeGameOver, RED);
    }
    break;
  }
  } // End switch (currentGameState)
}