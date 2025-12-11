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

// Define game states for managing different screens/flows
enum class GameState { TITLE_SCREEN, PLAYING, PAUSED, GAME_OVER };

class Game {
public:
  Game();
  ~Game();
  void Update();
  void Draw();
  void HandleInput();   // New
  void DrawControls();  // New
  void DrawNextPiece(); // New Feature // New
  void ResetGame();     // New: Resets the entire game state

private:
  Logic logic; // Replace direct grid manipulation

  // Game State Management
  GameState currentGameState; // Current state of the game
  std::string playerName;     // Stores the player's name
  std::string
      playerNameInputBuffer; // Buffer for name input in TITLE_SCREEN
  const int maxNameLength = 10; // Maximum length for player name

  // Cursor for name input
  float cursorBlinkTimer = 0.0f;
  bool showCursor = true;

  // Gravity
  float gravityTimer = 0.0f;
  float gravityInterval = 1.0f; // 1 sec

  // Delayed Auto Shift (DAS) for movement
  float dasTimer = 0.0f;   // Timer for auto shift
  float dasDelay = 0.2f;   // Initial delay before repeating (e.g., 0.2s)
  float dasRate = 0.05f;   // Speed of repeating (e.05s)
  int lastMoveDir = 0;     // -1 for left, 1 for right, 0 for none/reset

  const int cellSize = 30;
  // Screen 800x600. Board 300x600.
  // Center X: (800 - 300) / 2 = 250.
  const int offsetX = 250;
  const int offsetY = 0; // Full height

  // Touch Controls
  Button btnLeft, btnRight, btnRotate, btnDrop;
  Button btnRestart; // New: Restart button
  Button btnPause;   // Added: Pause button

  // Soft Drop Safety (Reset on Spawn)
  int lastSpawnCounter = 0;      // New: Tracks logic.spawnCounter to detect new piece spawns
  bool waitForDownRelease = false; // New: True if KEY_DOWN was held during spawn, requiring release
};