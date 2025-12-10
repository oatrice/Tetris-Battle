#pragma once
#include "logic.h" // New
#include "raylib.h"

#include <string>

struct Button {
  Rectangle rect;
  Color color;
  std::string text;
  bool active;
};

class Game {
public:
  Game();
  ~Game();
  void Update();
  void Draw();
  void HandleInput();  // New
  void DrawControls(); // New

private:
  Logic logic; // Replace direct grid manipulation

  // Gravity
  float gravityTimer = 0.0f;
  float gravityInterval = 1.0f; // 1 sec

  const int cellSize = 30;
  // Screen 800x600. Board 300x600.
  // Center X: (800 - 300) / 2 = 250.
  const int offsetX = 250;
  const int offsetY = 0; // Full height

  // Touch Controls
  Button btnLeft, btnRight, btnRotate, btnDrop;
};
