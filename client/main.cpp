#include "game.h"
#include "raylib.h"

#if defined(PLATFORM_WEB)
#include <emscripten/emscripten.h>
#endif

// Global game instance for the loop callback
Game *gameInstance = nullptr;

void UpdateDrawFrame() {
  if (!gameInstance)
    return;

  // 1. Update
  gameInstance->Update();

  // 2. Draw
  BeginDrawing();
  ClearBackground(BLACK); // Changed to BLACK for a darker main app background
  DrawText("Tetris Battle Client", 10, 10, 20,
           WHITE); // Changed text color to WHITE
  // DrawText("FPS: 60", 10, 30, 10, LIGHTGRAY); // Changed text color to
  // LIGHTGRAY

  gameInstance->Draw();

  EndDrawing();
}

int main() {
  const int screenWidth = 1200;
  const int screenHeight = 750; // Increased for touch controls

  InitWindow(screenWidth, screenHeight, "Tetris Battle");

  // Create Game Instance dynamically
  gameInstance = new Game();

#if defined(PLATFORM_WEB)
  // 0 means use browser's requestAnimationFrame (smoother)
  // 1 means simulate infinite loop
  emscripten_set_main_loop(UpdateDrawFrame, 60, 1);
#else
  SetTargetFPS(60);
  while (!WindowShouldClose()) {
    UpdateDrawFrame();
  }
#endif

  CloseWindow();

  // Cleanup (Note: WebAssembly usually kills memory on exit anyway, but good
  // practice)
  if (gameInstance)
    delete gameInstance;

  return 0;
}