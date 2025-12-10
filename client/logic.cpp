
#include "logic.h"
#include <random> // For random piece generation

// Static random device and generator for piece types
static std::random_device rd;
static std::mt19937 gen(rd());
static std::uniform_int_distribution<> distrib(static_cast<int>(PieceType::I),
                                               static_cast<int>(PieceType::Z));

Logic::Logic() { SpawnPiece(); }

void Logic::Tick() {
  // Attempt to move the piece down
  Piece nextPiece = currentPiece;
  nextPiece.y++; // Simulate moving down

  if (IsValidPosition(nextPiece)) {
    currentPiece = nextPiece; // Move piece down
  } else {
    // Collision detected (either floor or another locked piece)
    LockPiece();  // Lock the current piece into the board
    SpawnPiece(); // Spawn a new piece
  }
}

void Logic::SpawnPiece() {
  // Randomly select a piece type
  currentPiece.type = static_cast<PieceType>(distrib(gen));
  currentPiece.rotation = 0;            // Initial rotation
  currentPiece.x = BOARD_WIDTH / 2 - 2; // Spawn in the middle top
  currentPiece.y = 0;

  // Check if the newly spawned piece is immediately in an invalid position
  // This indicates a game over condition
  if (!IsValidPosition(currentPiece)) {
    // Game Over logic -> Reset for now
    board.Reset();
  }
}

bool Logic::IsValidPosition(const Piece &p) const {
  for (int i = 0; i < 4; ++i) { // Each piece has 4 blocks
    int blockOffsetX, blockOffsetY;
    p.GetBlock(p.rotation, i, blockOffsetX, blockOffsetY);

    int boardX = p.x + blockOffsetX;
    int boardY = p.y + blockOffsetY;

    // Check board boundaries
    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 ||
        boardY >= BOARD_HEIGHT) {
      return false; // Out of bounds
    }

    // Check for collision with existing blocks on the board
    // GetCell returns 0 for empty, >0 for occupied
    // FIXED: Using (boardY, boardX) because GetCell expects (row, col)
    if (board.GetCell(boardY, boardX) != 0) {
      return false; // Cell already occupied
    }
  }
  return true; // All blocks are in valid, empty positions
}

void Logic::LockPiece() {
  for (int i = 0; i < 4; ++i) { // Each piece has 4 blocks
    int blockOffsetX, blockOffsetY;
    currentPiece.GetBlock(currentPiece.rotation, i, blockOffsetX, blockOffsetY);

    int boardX = currentPiece.x + blockOffsetX;
    int boardY = currentPiece.y + blockOffsetY;

    // Only set if within bounds
    if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 &&
        boardY < BOARD_HEIGHT) {
      // FIXED: Using (boardY, boardX) because SetCell expects (row, col)
      board.SetCell(boardY, boardX, static_cast<int>(currentPiece.type));
    }
  }
}