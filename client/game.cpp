#include "game.h"
#include "raylib.h"  // For LoadFileText, SaveFileText
#include <algorithm> // Required for std::max
#include <vector>    // Required for std::vector in max initialization

Game::Game() {
  // Initialize game state to TITLE_SCREEN to prompt for player name
  currentGameState = GameState::TITLE_SCREEN;

  // Load player name at startup
  LoadPlayerName();
  // Initialize input buffer with the loaded name (or default "Player")
  playerNameInputBuffer = playerName;

  // Init Controls (Mobile UI)
  int btnY = 620;
  int btnSize = 80;
  int gap = 30;
  int startX = (800 - (4 * btnSize + 3 * gap)) / 2;

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
                (float)btnSize, (float)btnSize},
               GREEN,
               "^",
               false};
  btnDrop = {{(float)startX + 3 * (btnSize + gap), (float)btnY, (float)btnSize,
              (float)btnSize},
             ORANGE,
             "v",
             false};

  // Initialize Restart, Pause, and Change Name Buttons (UI Area, right of
  // board)
  int uiAreaX = offsetX + (10 * cellSize) + 20; // X position for UI elements
  int previewBoxHeight = 6 * cellSize;
  int currentY = offsetY + previewBoxHeight + 20; // Below Next Piece preview

  // Calculate required button width based on text to prevent overflow
  int btnTextFontSize = 30; // Matches the font size used in Draw()
  int restartTextWidth = MeasureText("Restart", btnTextFontSize);
  int pauseTextWidth = MeasureText("Pause", btnTextFontSize);
  int changeNameTextWidth = MeasureText("Change Name", btnTextFontSize);

  // Choose the maximum width and add padding (e.g., 20px on each side)
  int btnWidth =
      std::max({restartTextWidth, pauseTextWidth, changeNameTextWidth}) + 40;

  int btnHeight = 40;
  int btnVerticalGap = 10;

  btnRestart = {
      {(float)uiAreaX, (float)currentY, (float)btnWidth, (float)btnHeight},
      DARKBLUE,
      "Restart",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnPause = {
      {(float)uiAreaX, (float)currentY, (float)btnWidth, (float)btnHeight},
      GOLD, // Color: GOLD as requested
      "Pause",
      false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnChangeName = {
      {(float)uiAreaX, (float)currentY, (float)btnWidth, (float)btnHeight},
      PURPLE, // A distinct color for Change Name
      "Change Name",
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
          "Player"; // Default if file was empty or only contained whitespace
    }
  } else {
    // File not found or couldn't be loaded, set default
    playerName = "Player";
  }
}

void Game::SavePlayerName() {
  SaveFileText(playerNameFilename, const_cast<char *>(playerName.c_str()));
}

void Game::ResetGame() {
  logic.Reset(); // Resets board, score, and spawns a new piece
  gravityTimer = 0.0f;
  dasTimer = 0.0f;
  lastMoveDir = 0;
  lastSpawnCounter =
      logic.spawnCounter; // Sync after logic.Reset() spawns a new piece
  waitForDownRelease = false;
  btnRestart.active = false; // Ensure button is not active after reset
  btnPause.active = false;   // Ensure pause button is not active
  btnChangeName.active =
      false; // Ensure change name button is not active after reset
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
  // This allows restart from any state except TITLE_SCREEN,
  // where "Restart" doesn't make sense yet.
  btnRestart.active = false; // Reset visual state for this frame
  if (CheckCollisionPointRec(mouse, btnRestart.rect)) {
    btnRestart.active = true;
    if (mouseClicked) {
      if (currentGameState != GameState::TITLE_SCREEN) {
        ResetGame();
        currentGameState =
            GameState::PLAYING; // After reset, always go to playing
        return; // Game reset, no further input processing this frame
      }
    }
  }

  // Keyboard input for Restart (e.g., 'R' key)
  if (IsKeyPressed(KEY_R)) {
    if (currentGameState != GameState::TITLE_SCREEN) {
      ResetGame();
      currentGameState = GameState::PLAYING;
      return; // Game reset, no further input processing this frame
    }
  }

  // --- Global Input for Change Name Button ---
  // Only allow changing name if not already on the title screen
  if (currentGameState != GameState::TITLE_SCREEN) {
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
        playerName = "Player"; // Default if no name entered
      }
      SavePlayerName(); // Save the new/updated player name
      ResetGame();      // Initialize game for playing state
      currentGameState = GameState::PLAYING; // Transition to playing
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

    // --- Soft Drop Safety Logic ---
    // 1. Detect if a new piece has spawned since the last frame
    if (logic.spawnCounter != lastSpawnCounter) {
      lastSpawnCounter = logic.spawnCounter;
      // If KEY_DOWN is currently held, activate the safety flag
      if (IsKeyDown(KEY_DOWN)) {
        waitForDownRelease = true;
      }
    }
    // 2. If the safety flag is active, check if KEY_DOWN has been released
    if (!IsKeyDown(KEY_DOWN)) {
      waitForDownRelease = false;
    }
    // --- End Soft Drop Safety Logic ---

    // Reset Active State for non-restart/pause touch buttons
    btnLeft.active = false;
    btnRight.active = false;
    btnRotate.active = false;
    btnDrop.active = false;

    // Mouse / Touch input for game buttons (using IsMouseButtonDown for
    // continuous feedback)
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

    // --- Keyboard Delayed Auto Shift (DAS) for LEFT/RIGHT movement ---
    // Handle key releases first to clear `lastMoveDir` if the active key is
    // let go.
    if (IsKeyReleased(KEY_LEFT) && lastMoveDir == -1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }
    if (IsKeyReleased(KEY_RIGHT) && lastMoveDir == 1) {
      dasTimer = 0.0f;
      lastMoveDir = 0;
    }

    // Determine the current desired move direction from keyboard
    int currentKeyboardMoveDir = 0;
    if (IsKeyDown(KEY_LEFT)) {
      currentKeyboardMoveDir = -1;
    }
    if (IsKeyDown(KEY_RIGHT)) {
      currentKeyboardMoveDir = 1;
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
    // Rotate
    if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_SPACE)) {
      logic.Rotate();
    }
    // Soft Drop (continuous) - now includes soft drop safety check
    if (IsKeyDown(KEY_DOWN) && !waitForDownRelease) {
      logic.Move(0, 1);
    }
    // --- End Other Keyboard Controls ---

    // --- Touch Controls (Single Press except for Soft Drop) ---
    static bool leftPressed = false;
    static bool rightPressed = false;
    static bool rotatePressed = false;

    if (btnLeft.active && !leftPressed) {
      logic.Move(-1, 0);
    }
    if (btnRight.active && !rightPressed) {
      logic.Move(1, 0);
    }
    if (btnRotate.active && !rotatePressed) {
      logic.Rotate();
    }
    if (btnDrop.active) { // Touch soft drop is continuous
      logic.Move(0, 1);
    }

    // Update static states for touch buttons
    leftPressed = btnLeft.active;
    rightPressed = btnRight.active;
    rotatePressed = btnRotate.active;
    // --- End Touch Controls ---
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
    // Gravity System
    gravityTimer += GetFrameTime();
    if (gravityTimer >= gravityInterval) {
      logic.Tick();
      gravityTimer = 0.0f;
    }

    // Check for game over after logic tick
    if (logic.isGameOver) {
      currentGameState = GameState::GAME_OVER;
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

void Game::DrawNextPiece() {
  int previewX = offsetX + (10 * cellSize) + 20; // Right of board
  int previewY = offsetY;
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

void Game::Draw() {
  // 1. Board Background
  DrawRectangle(offsetX, offsetY, 10 * cellSize, 20 * cellSize, DARKGRAY);

  // 2. Static Grid (Locked Pieces) - Always draw if not in TITLE_SCREEN
  if (currentGameState != GameState::TITLE_SCREEN) {
    for (int i = 0; i < 20; i++) {
      for (int j = 0; j < 10; j++) {
        int x = offsetX + j * cellSize;
        int y = offsetY + i * cellSize;

        if (logic.board.GetCell(i, j) != 0) {
          DrawRectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, RED);
        } else {
          DrawRectangleLines(x, y, cellSize, cellSize, Fade(LIGHTGRAY, 0.1f));
        }
      }
    }
  }

  // 3. Active Piece (Current) - Only draw if game is in progress or paused/over
  if (currentGameState == GameState::PLAYING ||
      currentGameState == GameState::PAUSED ||
      currentGameState == GameState::GAME_OVER) {
    Piece p = logic.currentPiece;
    if (p.type != PieceType::NONE) {
      for (int i = 0; i < 4; i++) {
        int bx, by;
        p.GetBlock(p.rotation, i, bx, by);
        int worldX = offsetX + (p.x + bx) * cellSize;
        int worldY = offsetY + (p.y + by) * cellSize;

        DrawRectangle(worldX + 1, worldY + 1, cellSize - 2, cellSize - 2,
                      GREEN);
      }
    }
  }

  // 4. Board Border - Always draw if not in TITLE_SCREEN
  if (currentGameState != GameState::TITLE_SCREEN) {
    DrawRectangleLines(offsetX, offsetY, 10 * cellSize, 20 * cellSize, WHITE);
  }

  // 5. UI Elements (Controls, Next Piece, Score, Player Name)
  if (currentGameState != GameState::TITLE_SCREEN) {
    DrawControls();
    DrawNextPiece();

    // Display the score
    DrawText(TextFormat("SCORE: %d", logic.score), 50, 50, 20, WHITE);
    // Display player name
    if (!playerName.empty()) {
      DrawText(TextFormat("PLAYER: %s", playerName.c_str()), 50, 80, 20, WHITE);
    }
  }

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

  // Draw Change Name button (only if NOT in TITLE_SCREEN)
  if (currentGameState != GameState::TITLE_SCREEN) {
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

  // --- Draw State-specific overlays ---
  switch (currentGameState) {
  case GameState::TITLE_SCREEN: {
    int screenWidth = 800;
    int screenHeight = 600;

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
        (playerNameInputBuffer.empty() && playerName == "Player")
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
    const char *enterPrompt = "PRESS ENTER TO START";
    int enterPromptFontSize = 20;
    int enterPromptWidth = MeasureText(enterPrompt, enterPromptFontSize);
    DrawText(enterPrompt, (screenWidth - enterPromptWidth) / 2,
             screenHeight / 2 + 60, enterPromptFontSize, LIGHTGRAY);
    break;
  }
  case GameState::PAUSED: {
    int boardWidth = BOARD_WIDTH * cellSize;
    int boardHeight = BOARD_HEIGHT * cellSize;

    // Draw semi-transparent black overlay over the board area
    DrawRectangle(offsetX, offsetY, boardWidth, boardHeight, Fade(BLACK, 0.7f));

    // Draw "PAUSED" text
    const char *pausedText = "PAUSED";
    int textFontSizePaused = 50;
    int textWidthPaused = MeasureText(pausedText, textFontSizePaused);
    int textX = offsetX + (boardWidth - textWidthPaused) / 2;
    int textY =
        offsetY + (boardHeight / 2) - textFontSizePaused; // Center vertically

    DrawText(pausedText, textX, textY, textFontSizePaused, WHITE);
    break;
  }
  case GameState::GAME_OVER: {
    int boardWidth = BOARD_WIDTH * cellSize;
    int boardHeight = BOARD_HEIGHT * cellSize;

    // Draw semi-transparent black overlay over the board area
    DrawRectangle(offsetX, offsetY, boardWidth, boardHeight, Fade(BLACK, 0.7f));

    // Draw "GAME OVER" text
    const char *gameOverText = "GAME OVER";
    int textFontSizeGameOver = 50;
    int textWidthGameOver = MeasureText(gameOverText, textFontSizeGameOver);
    int textX = offsetX + (boardWidth - textWidthGameOver) / 2;
    int textY = offsetY + (boardHeight / 2) -
                textFontSizeGameOver; // Slightly above center

    DrawText(gameOverText, textX, textY, textFontSizeGameOver, RED);
    break;
  }
  case GameState::PLAYING: {
    // No specific overlay for PLAYING state
    break;
  }
  } // End switch (currentGameState)
}