#include "game.h"

Game::Game() {
  // Start Game
  logic.SpawnPiece(); // Next -> Current, New Next

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
               "R",
               false};
  btnDrop = {{(float)startX + 3 * (btnSize + gap), (float)btnY, (float)btnSize,
              (float)btnSize},
             ORANGE,
             "v",
             false};
}

Game::~Game() {}

void Game::HandleInput() {
  // Reset Active State
  btnLeft.active = false;
  btnRight.active = false;
  btnRotate.active = false;
  btnDrop.active = false;

  // Mouse / Touch
  if (IsMouseButtonDown(MOUSE_LEFT_BUTTON)) {
    Vector2 mouse = GetMousePosition();
    if (CheckCollisionPointRec(mouse, btnLeft.rect))
      btnLeft.active = true;
    if (CheckCollisionPointRec(mouse, btnRight.rect))
      btnRight.active = true;
    if (CheckCollisionPointRec(mouse, btnRotate.rect))
      btnRotate.active = true;
    if (CheckCollisionPointRec(mouse, btnDrop.rect))
      btnDrop.active = true;
  }

  // Keyboard & Button Logic
  static bool leftPressed = false;
  static bool rightPressed = false;
  static bool rotatePressed = false;

  // Move Left
  if (IsKeyPressed(KEY_LEFT) || (btnLeft.active && !leftPressed))
    logic.Move(-1, 0);

  // Move Right
  if (IsKeyPressed(KEY_RIGHT) || (btnRight.active && !rightPressed))
    logic.Move(1, 0);

  // Rotate
  if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_SPACE) ||
      (btnRotate.active && !rotatePressed))
    logic.Rotate();

  // Soft Drop
  if (IsKeyDown(KEY_DOWN) || btnDrop.active)
    logic.Move(0, 1);

  // Update states
  leftPressed = btnLeft.active;
  rightPressed = btnRight.active;
  rotatePressed = btnRotate.active;
}

void Game::Update() {
  HandleInput();

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
    DrawText(b->text.c_str(), b->rect.x + (b->rect.width / 2 - 10),
             b->rect.y + (b->rect.height / 2 - 15), 30, WHITE);
  }
}

void Game::DrawNextPiece() {
  int previewX = offsetX + (10 * cellSize) + 20; // Right of board
  int previewY = offsetY;
  int previewSize = 4 * cellSize;

  // Draw Box
  DrawText("NEXT", previewX, previewY - 30, 20, WHITE);
  DrawRectangleLines(previewX, previewY, previewSize, previewSize, WHITE);

  // Draw Piece inside box
  Piece p = logic.nextPiece;
  if (p.type != PieceType::NONE) {
    // Shift to center of preview box
    int centerX = previewX + (cellSize / 2);
    int centerY = previewY + (cellSize / 2);

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
  DrawNextPiece(); // <--- New Feature!
}