
#pragma once
#include "raylib.h"

class Game {
public:
  Game();
  ~Game();
  void Update();
  void Draw();

private:
  int grid[20][10]; // 20 rows, 10 cols
  const int cellSize = 30;
  // Screen 800x600. Board 300x600.
  // Center X: (800 - 300) / 2 = 250.
  const int offsetX = 250;
  const int offsetY = 0; // Full height
};
