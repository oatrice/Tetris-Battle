#include "game.h"

Game::Game() {
  // Start Game
  logic.SpawnPiece(); // Next -> Current, New Next

  // Initialize game state variables
  isPaused = false; // Added: Initialize pause state
  lastSpawnCounter = logic.spawnCounter; // Sync with initial piece spawn

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

  // Initialize Restart and Pause Buttons (UI Area, right of board)
  int uiAreaX = offsetX + (10 * cellSize) + 20; // X position for UI elements
  int previewBoxHeight = 6 * cellSize;
  int currentY = offsetY + previewBoxHeight + 20; // Below Next Piece preview

  int btnWidth = 100;
  int btnHeight = 40;
  int btnVerticalGap = 10;

  btnRestart = {{(float)uiAreaX, (float)currentY, (float)btnWidth,
                 (float)btnHeight},
                DARKBLUE,
                "Restart",
                false};

  currentY += btnHeight + btnVerticalGap; // Move Y down for next button

  btnPause = {{(float)uiAreaX, (float)currentY, (float)btnWidth,
               (float)btnHeight},
              GOLD, // Color: GOLD as requested
              "Pause",
              false};
}

Game::~Game() {}

void Game::ResetGame() {
  logic.Reset();
  isPaused = false; // Added: Reset pause state
  // logic.isGameOver is set to false by logic.Reset()
  gravityTimer = 0.0f;
  dasTimer = 0.0f;
  lastMoveDir = 0;
  lastSpawnCounter =
      logic.spawnCounter; // Sync after logic.Reset() spawns a new piece
  waitForDownRelease = false;
  btnRestart.active = false; // Ensure button is not active after reset
  btnPause.active = false;   // Added: Ensure pause button is not active
}

void Game::HandleInput() {
  Vector2 mouse = GetMousePosition();
  // Use IsMouseButtonPressed for single-click actions to prevent repeated toggles/resets
  bool mouseClicked = IsMouseButtonPressed(MOUSE_LEFT_BUTTON);

  // --- Input for Persistent Restart Button ---
  btnRestart.active = false; // Reset visual state for this frame
  if (CheckCollisionPointRec(mouse, btnRestart.rect)) {
      btnRestart.active = true;
      if (mouseClicked) {
          ResetGame();
          return; // Game reset, no further input processing this frame
      }
  }

  // Keyboard input for Restart (e.g., 'R' key)
  if (IsKeyPressed(KEY_R)) { // Allow restart anytime
    ResetGame();
    return; // Game reset, no further input processing this frame
  }

  // --- Input for Pause Button ---
  btnPause.active = false; // Reset visual state for this frame
  if (CheckCollisionPointRec(mouse, btnPause.rect)) {
      btnPause.active = true;
      if (mouseClicked) {
          isPaused = !isPaused; // Toggle pause state
      }
  }

  // Keyboard input for Pause (e.g., 'P' key)
  if (IsKeyPressed(KEY_P)) {
      isPaused = !isPaused; // Toggle pause state
  }

  // IMPORTANT: If game is paused or over, ignore other game inputs (movement, rotation)
  // but allow restart and pause buttons to function.
  if (isPaused || logic.isGameOver) {
    return; // Skip all normal game controls
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

  // Mouse / Touch input for game buttons (using IsMouseButtonDown for continuous feedback)
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
  // Handle key releases first to clear `lastMoveDir` if the active key is let
  // go. This is important for "rolling" from one key to another (e.g., Left
  // held, then Right pressed, then Right released, Left should become active
  // again with a fresh DAS timer).
  if (IsKeyReleased(KEY_LEFT) && lastMoveDir == -1) {
    dasTimer = 0.0f;
    lastMoveDir = 0;
  }
  if (IsKeyReleased(KEY_RIGHT) && lastMoveDir == 1) {
    dasTimer = 0.0f;
    lastMoveDir = 0;
  }

  // Determine the current desired move direction from keyboard (right takes
  // precedence if both are down)
  int currentKeyboardMoveDir = 0;
  if (IsKeyDown(KEY_LEFT)) {
    currentKeyboardMoveDir = -1;
  }
  if (IsKeyDown(KEY_RIGHT)) {
    currentKeyboardMoveDir = 1;
  }

  // Check for initial press or change in active DAS direction
  if (currentKeyboardMoveDir != 0 && currentKeyboardMoveDir != lastMoveDir) {
    // New key is pressed or a different key took over.
    logic.Move(currentKeyboardMoveDir, 0); // Initial move for the new direction
    dasTimer = 0.0f;                       // Reset timer for the new direction
    lastMoveDir = currentKeyboardMoveDir;
  }
  // If the same key is held down (DAS repeat)
  else if (currentKeyboardMoveDir != 0 &&
           currentKeyboardMoveDir == lastMoveDir) {
    dasTimer += GetFrameTime();

    // After initial delay, start repeating movement at dasRate
    while (dasTimer >= dasDelay) {
      logic.Move(lastMoveDir, 0);
      dasTimer -= dasRate; // Subtract dasRate to schedule the next repeat
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
  // Use static bools to ensure single activation per touch for non-continuous
  // actions
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
}

void Game::Update() {
  HandleInput(); // Always handle input to check for restart/pause

  // Added: If game is paused or over, skip all game logic updates
  if (isPaused || logic.isGameOver) {
    return;
  }

  // Normal game logic if not game over and not paused
  // Gravity System
  gravityTimer += GetFrameTime();
  if (gravityTimer >= gravityInterval) {
    logic.Tick();
    gravityTimer = 0.0f;
  }
}

void Game::DrawControls() {
  Button *btns[] = {&btnLeft, &btnRight, &btnRotate, &btnDrop};
  for (auto b : btns) {
    DrawRectangleRec(b->rect, b->active ? Fade(b->color, 0.5f) : b->color);
    DrawRectangleLinesEx(b->rect, 2, DARKGRAY);
    if (b->text == "^" || b->text == "v") {
      // User Request: Use '<' rotated to form Up "^" and Down "v" arrows
      // This ensures the style matches the other buttons (<, >) perfectly.
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
  // Increase previewSize to accommodate rotated 'I' piece and provide more
  // padding.
  int previewSize = 6 * cellSize; // Changed from 4 * cellSize

  // Draw Box
  DrawText("NEXT", previewX, previewY - 30, 20, WHITE);

  // Draw a filled rectangle for the background of the preview box
  // This improves contrast for the GOLD piece and WHITE border/text.
  // Ensure the background rectangle uses the new larger previewSize.
  DrawRectangle(previewX, previewY, previewSize, previewSize, BLACK);

  // Ensure the border rectangle uses the new larger previewSize.
  DrawRectangleLines(previewX, previewY, previewSize, previewSize, WHITE);

  // Draw Piece inside box
  Piece p = logic.nextPiece;
  if (p.type != PieceType::NONE) {
    // Adjust centerX and centerY calculation to ensure pieces are centered
    // within the new 6x6 preview box, assuming pieces fit within a 4x4 grid.
    // (6 * cellSize - 4 * cellSize) / 2 = 1 * cellSize padding on each side.
    int centerX =
        previewX +
        cellSize; // Shift by 1 cell from the left edge of the preview box
    int centerY =
        previewY +
        cellSize; // Shift by 1 cell from the top edge of the preview box

    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(0, i, bx, by); // Use rotation 0 for preview

      int drawX = centerX + (bx * cellSize);
      int drawY = centerY + (by * cellSize);

      // Changed color from YELLOW to GOLD for higher contrast
      DrawRectangle(drawX + 1, drawY + 1, cellSize - 2, cellSize - 2, GOLD);
    }
  }
}

void Game::Draw() {
  // 1. Board Background
  DrawRectangle(offsetX, offsetY, 10 * cellSize, 20 * cellSize, DARKGRAY);

  // 2. Static Grid (Locked Pieces)
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

  // 3. Active Piece (Current)
  Piece p = logic.currentPiece;
  if (p.type != PieceType::NONE) {
    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(p.rotation, i, bx, by);
      int worldX = offsetX + (p.x + bx) * cellSize;
      int worldY = offsetY + (p.y + by) * cellSize;

      // Ghost / Shadow could be added here later
      DrawRectangle(worldX + 1, worldY + 1, cellSize - 2, cellSize - 2, GREEN);
    }
  }

  // 4. Board Border
  DrawRectangleLines(offsetX, offsetY, 10 * cellSize, 20 * cellSize, WHITE);

  // 5. UI Elements
  DrawControls();
  DrawNextPiece();

  // Display the score
  DrawText(TextFormat("SCORE: %d", logic.score), 50, 50, 20, WHITE);

  // --- Draw Restart and Pause buttons always ---
  int btnTextFontSize = 30; // Defined once for both buttons

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

  // Draw Pause button
  DrawRectangleRec(btnPause.rect, btnPause.active
                                      ? Fade(btnPause.color, 0.5f)
                                      : btnPause.color);
  DrawRectangleLinesEx(btnPause.rect, 2, DARKGRAY);
  btnTextWidth = MeasureText(btnPause.text.c_str(), btnTextFontSize); // Recalculate for Pause text
  DrawText(btnPause.text.c_str(),
           btnPause.rect.x + (btnPause.rect.width / 2 - btnTextWidth / 2),
           btnPause.rect.y +
               (btnPause.rect.height / 2 - (btnTextFontSize / 2)),
           btnTextFontSize, WHITE);

  // --- Draw Game Over overlay if game is over ---
  if (logic.isGameOver) {
    int boardWidth = BOARD_WIDTH * cellSize;
    int boardHeight = BOARD_HEIGHT * cellSize;

    // Draw semi-transparent black overlay over the board area
    DrawRectangle(offsetX, offsetY, boardWidth, boardHeight, Fade(BLACK, 0.7f));

    // Draw "GAME OVER" text
    const char *gameOverText = "GAME OVER";
    int textFontSizeGameOver = 50; // Use a different font size variable for game over text
    int textWidthGameOver = MeasureText(gameOverText, textFontSizeGameOver);
    int textX = offsetX + (boardWidth - textWidthGameOver) / 2;
    int textY =
        offsetY + (boardHeight / 2) - textFontSizeGameOver; // Slightly above center

    DrawText(gameOverText, textX, textY, textFontSizeGameOver, RED);
  }

  // --- Draw PAUSED overlay if game is paused ---
  if (isPaused && !logic.isGameOver) { // Only draw if paused and not game over
    int boardWidth = BOARD_WIDTH * cellSize;
    int boardHeight = BOARD_HEIGHT * cellSize;

    // Draw semi-transparent black overlay over the board area
    DrawRectangle(offsetX, offsetY, boardWidth, boardHeight, Fade(BLACK, 0.7f));

    // Draw "PAUSED" text
    const char *pausedText = "PAUSED";
    int textFontSizePaused = 50; // Use a different font size variable for paused text
    int textWidthPaused = MeasureText(pausedText, textFontSizePaused);
    int textX = offsetX + (boardWidth - textWidthPaused) / 2;
    int textY =
        offsetY + (boardHeight / 2) - textFontSizePaused; // Center vertically

    DrawText(pausedText, textX, textY, textFontSizePaused, WHITE);
  }
}