#pragma once
#include "logic.h"
#include "raylib.h"

#include <map> // For storing player names
#include <string>
#include <vector> // Required for std::vector in max initialization

struct Button {
  Rectangle rect;
  Color color;
  std::string text;
  bool active;
};

// Define game states for managing different screens/flows
enum class GameState {
  TITLE_SCREEN,
  MODE_SELECTION, // New: Choose 1-player or 2-player local
  PLAYING,
  PAUSED,
  GAME_OVER
};

// New: Define game modes for different player counts
enum class GameMode { SINGLE_PLAYER, TWO_PLAYER_LOCAL, TWO_PLAYER_NETWORK };

class Game {
public:
  Game();
  ~Game();
  void Update();
  void Draw();
  void HandleInput();
  void DrawControls();
  // Renamed and made private, now called by DrawPlayerUI
  // void DrawNextPiece(const Logic& logic, int previewX, int previewY);
  void ResetGame(); // Resets the entire game state

private:
  Logic logicPlayer1; // Player 1's game logic
  Logic logicPlayer2; // Player 2's game logic (for local multiplayer)

  // Game State Management
  GameState currentGameState; // Current state of the game
  GameMode currentMode; // Current game mode (1-player, 2-player local, etc.)

  std::string playerName;            // Stores the player's name (for P1)
  std::string playerNameInputBuffer; // Buffer for name input in TITLE_SCREEN
  const int maxNameLength = 10;      // Maximum length for player name
  const char *playerNameFilename =
      "player_name.txt"; // File to save/load player name

  // Cursor for name input
  float cursorBlinkTimer = 0.0f;
  bool showCursor = true;

  // Gravity
  float gravityTimerP1 = 0.0f;
  float gravityTimerP2 = 0.0f;
  float gravityInterval = 1.0f; // 1 sec

  // Delayed Auto Shift (DAS) for movement
  float dasTimerP1 = 0.0f; // Timer for auto shift P1
  float dasTimerP2 = 0.0f; // Timer for auto shift P2
  float dasDelay = 0.2f;   // Initial delay before repeating (e.g., 0.2s)
  float dasRate = 0.05f;   // Speed of repeating (e.05s)
  int lastMoveDirP1 = 0;   // -1 for left, 1 for right, 0 for none/reset P1
  int lastMoveDirP2 = 0;   // -1 for left, 1 for right, 0 for none/reset P2

  const int cellSize = 30;
  // Screen 1200x600.
  // Player 1 Board: Left side.
  // Player 2 Board: Right side.
  // UI elements: Right of Player 2 board.
  const int screenWidth = 1400; // Increased width for two boards
  const int screenHeight = 750;

  // Board positions
  const int BOARD_WIDTH_PX = 10 * cellSize;
  const int BOARD_HEIGHT_PX = 20 * cellSize;
  const int BOARD_OFFSET_Y = 40; // Full height

  // Player 1 board starts at X = 65 (Moved right by 50px)
  const int BOARD_OFFSET_X_P1 = 65;
  // Player 2: 15 + 300 + 270 = 585 (Moved right by 35px from previous 550)
  const int BOARD_OFFSET_X_P2 = BOARD_OFFSET_X_P1 + BOARD_WIDTH_PX + 270;

  // UI Area X position (right of P2 board)
  const int UI_AREA_X = BOARD_OFFSET_X_P2 + BOARD_WIDTH_PX + 20;

  // Touch Controls (Shared for now, can be adapted for separate controls)
  Button btnLeft, btnRight, btnRotate, btnDrop;
  Button btnRestart;    // Restart button
  Button btnPause;      // Pause button
  Button btnChangeName; // Change Name button

  // New buttons for mode selection
  Button btnSinglePlayer;
  Button btnTwoPlayerLocal;

  // Soft Drop Safety (Reset on Spawn)
  int lastSpawnCounterP1 = 0;        // Tracks logicPlayer1.spawnCounter
  bool waitForDownReleaseP1 = false; // For P1
  int lastSpawnCounterP2 = 0;        // Tracks logicPlayer2.spawnCounter
  bool waitForDownReleaseP2 = false; // For P2

  // Private methods for name persistence
  void LoadPlayerName();
  void SavePlayerName();

  // Helper functions for drawing player-specific elements
  void DrawPlayerBoard(const Logic &logic, int boardOffsetX, int boardOffsetY);
  void DrawPlayerNextPiece(const Logic &logic, int previewX, int previewY);
  void DrawPlayerScore(const Logic &logic, int uiAreaX, int &currentY,
                       const std::string &name);
  void HandlePlayerInput(Logic &logic, int playerIndex, float dasDelay,
                         float dasRate, float &dasTimer, int &lastMoveDir,
                         int &lastSpawnCounter, bool &waitForDownRelease);
};