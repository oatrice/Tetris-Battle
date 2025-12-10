
#include "game.h"

Game::Game() {
  // Initialize grid logic
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      grid[i][j] = 0;
    }
  }

  // Debug: Add some blocks to verify rendering
  grid[19][0] = 1; // Wall
  grid[19][9] = 1; // Wall
  grid[10][5] = 1; // Center block
}

Game::~Game() {}

void Game::Update() {
  // Todo: Input handling & Gravity
}

void Game::Draw() {
  // Draw Board Background
  DrawRectangle(offsetX, offsetY, 10 * cellSize, 20 * cellSize, DARKGRAY);

  // Draw Grid Cells
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      int x = offsetX + j * cellSize;
      int y = offsetY + i * cellSize;

      // Draw Cell
      if (grid[i][j] != 0) {
        // Draw Block
        DrawRectangle(x + 1, y + 1, cellSize - 2, cellSize - 2, RED);
      } else {
        // Draw Faint Grid Line
        DrawRectangleLines(x, y, cellSize, cellSize, Fade(LIGHTGRAY, 0.3f));
      }
    }
  }

  // Draw Border around board
  DrawRectangleLines(offsetX, offsetY, 10 * cellSize, 20 * cellSize, WHITE);
}
