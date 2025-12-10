#include "game.h"

#include "game.h"

#include "game.h"

Game::Game() {
  // Start Game
  logic.SpawnPiece(); // Random Piece

  // Init Buttons (Layout for Mobile)
  int btnY = 620; // Lower area
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

  // Mouse / Touch Detection
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
  static bool dropPressed = false;

  // Helper to handle both Key and Virtual Button (Single Press)
  bool left = IsKeyPressed(KEY_LEFT) || (btnLeft.active && !leftPressed);
  if (left)
    logic.Move(-1, 0);

  bool right = IsKeyPressed(KEY_RIGHT) || (btnRight.active && !rightPressed);
  if (right)
    logic.Move(1, 0);

  bool rotate = IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_SPACE) ||
                (btnRotate.active && !rotatePressed);
  if (rotate)
    logic.Rotate();

  // Soft Drop (Continuous)
  if (IsKeyDown(KEY_DOWN) || btnDrop.active) {
    // Slow down drop speed slightly compared to free fall if needed
    logic.Move(0, 1);
  }

  // Update button states for single-press detection
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

void Game::Draw() {
  // Draw Board Background
  DrawRectangle(offsetX, offsetY, 10 * cellSize, 20 * cellSize, DARKGRAY);

  // 1. Draw Static Grid Cells
  // Direct access to public 'board' member
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      int x = offsetX + j * cellSize;
      int y = offsetY + i * cellSize;

      if (logic.board.GetCell(i, j) != 0) {
        DrawRectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, RED);
      } else {
        DrawRectangleLines(x, y, cellSize, cellSize, Fade(LIGHTGRAY, 0.3f));
      }
    }
  }

  // 2. Draw Active Piece
  // Direct access to public 'currentPiece' member
  Piece p = logic.currentPiece;
  if (p.type != PieceType::NONE) {
    // Draw all 4 blocks of the piece
    for (int i = 0; i < 4; i++) {
      int bx, by;
      p.GetBlock(p.rotation, i, bx, by);

      int worldX = offsetX + (p.x + bx) * cellSize;
      int worldY = offsetY + (p.y + by) * cellSize;

      DrawRectangle(worldX + 1, worldY + 1, cellSize - 2, cellSize - 2, GREEN);
    }
  }

  // Draw Border
  DrawRectangleLines(offsetX, offsetY, 10 * cellSize, 20 * cellSize, WHITE);

  // Draw Controls
  DrawControls();
}
