#pragma once
#include "logic.h"
#include "network_manager.h" // Include NetworkManager
#include "raylib.h"

// ... (existing code)

// Private network-related methods (placeholders for actual network calls)
void StartHosting();
void StopHosting();
void ConnectToHost(const std::string &ip);
void Disconnect();
void SendGameEvent(const std::string &eventData); // e.g., "move_left", "rotate"
void ProcessNetworkEvents();     // Called in Update() to read incoming messages
std::string GetLocalIPAddress(); // Placeholder to get local IP

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
  MODE_SELECTION, // New: Choose 1-player, 2-player local, or 2-player network
  NETWORK_SETUP,  // New: For host/join selection, IP input, connection status
  PLAYING,
  PAUSED,
  GAME_OVER
};

// New: Define game modes for different player counts
enum class GameMode {
  SINGLE_PLAYER,
  TWO_PLAYER_LOCAL,
  TWO_PLAYER_NETWORK_HOST,  // New: Player is hosting an online game
  TWO_PLAYER_NETWORK_CLIENT // New: Player is joining an online game
};

// New: Define network states for managing connection flow within NETWORK_SETUP
enum class NetworkState {
  DISCONNECTED,      // Not attempting any network connection
  HOSTING_WAITING,   // Host is waiting for a client to connect
  CLIENT_CONNECTING, // Client is attempting to connect to a host
  CONNECTED,         // Connection established, waiting for game to start
  IN_GAME,           // Network game is actively playing
  CONNECTION_FAILED  // New: Connection attempt failed or lost
};

class Game {
public:
  Game();
  ~Game();
  void Update();
  void Draw();
  void HandleInput();
  void DrawControls();
  void ResetGame(); // Resets the entire game state

private:
  Logic logicPlayer1; // Player 1's game logic (local player)
  Logic logicPlayer2; // Player 2's game logic (local or remote player)

  // Game State Management
  GameState currentGameState; // Current state of the game
  GameMode currentMode; // Current game mode (1-player, 2-player local, etc.)

  // New: Network State Management
  NetworkState currentNetworkState; // Current state of the network connection

  // New: Game Over specific states for 2-player local/network mode
  bool player1IsDead;
  bool player2IsDead;
  std::string winnerName; // Stores the name of the winner or "It's a Tie!"

  std::string playerName;            // Stores the player's name (for P1)
  std::string playerNameInputBuffer; // Buffer for name input in TITLE_SCREEN
  const int maxNameLength = 10;      // Maximum length for player name
  const char *playerNameFilename =
      "player_name.txt"; // File to save/load player name

  // Network-specific variables
  bool isHost;                      // True if this instance is hosting the game
  std::string remotePlayerName;     // Name of the opponent in network mode
  std::string ipAddressInputBuffer; // Buffer for IP address input (client)
  const int maxIpLength =
      15; // Maximum length for IP address (e.g., 255.255.255.255)
  std::string
      currentIpAddress; // Stores the IP address being hosted on or connected to
  const int networkPort = 12345;   // Default port for network communication
  std::string networkErrorMessage; // To display error reason

  // Cursor for name/IP input
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
  Button btnTwoPlayerNetwork; // New: Button to select network mode

  // New buttons for network setup
  Button btnHostGame;
  Button btnJoinGame;
  Button btnConnect;         // To initiate client connection
  Button btnStartOnlineGame; // Host-only: to start game once client connected

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

  // Private network-related methods (placeholders for actual network calls)
  void StartHosting();
  void StopHosting();
  void ConnectToHost(const std::string &ip);
  void Disconnect();
  void
  SendGameEvent(const std::string &eventData); // e.g., "move_left", "rotate"
  void ProcessNetworkEvents(); // Called in Update() to read incoming messages
  std::string GetLocalIPAddress(); // Placeholder to get local IP

  NetworkManager networkManager; // The actual network handler
};