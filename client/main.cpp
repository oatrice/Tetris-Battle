#include "game.h"
#include "raylib.h"

int main() {
  const int screenWidth = 800;
  const int screenHeight = 750; // Increased for touch controls

  InitWindow(screenWidth, screenHeight, "Tetris Battle");
  SetTargetFPS(60);

  Game game; // Instantiate Game Logic

  while (!WindowShouldClose()) {
    // 1. Update
    game.Update();

    // 2. Draw
    BeginDrawing();
    ClearBackground(RAYWHITE);
    DrawText("Tetris Battle Client", 10, 10, 20, DARKGRAY);
    DrawText("FPS: 60", 10, 30, 10, GRAY);

    game.Draw();

    EndDrawing();
  }

  CloseWindow();
  return 0;
}
