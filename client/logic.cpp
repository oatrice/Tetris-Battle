#include "logic.h"
#include <iostream>
#include <random>
#include <cstring> // For memset

// Static random setup
static std::random_device rd;
static std::mt19937 gen(rd());
static std::uniform_int_distribution<> distrib(1, 7); // PieceTypes 1-7 (I, O, T, S, Z, J, L)

Logic::Logic() {
  // Initialize nextPiece first with a random piece.
  // Its position doesn't matter until it becomes currentPiece.
  nextPiece = Piece(static_cast<PieceType>(distrib(gen)));
  nextPiece.x = 0;
  nextPiece.y = 0;
  nextPiece.rotation = 0;

  // Call SpawnPiece, which will move the initialized nextPiece to currentPiece
  // and then generate a new random piece for nextPiece.
  SpawnPiece();

  // Initialize score
  score = 0;
}

void Logic::SpawnPiece() {
  // 1. Shift the 'nextPiece' to become the 'currentPiece'.
  currentPiece = nextPiece;
  currentPiece.x = BOARD_WIDTH / 2 - 2; // Approximate center spawn position
  currentPiece.y = 0;
  currentPiece.rotation = 0;

  // 2. Generate a NEW random piece for 'nextPiece'.
  nextPiece = Piece(static_cast<PieceType>(distrib(gen)));
  nextPiece.x = 0; // Reset position for the new nextPiece
  nextPiece.y = 0;
  nextPiece.rotation = 0;

  // Increment spawn counter for the newly spawned piece
  spawnCounter++;

  // Game Over Check: If the newly spawned currentPiece is immediately invalid,
  // it means the game is over.
  if (!IsValidPosition(currentPiece)) {
    isGameOver = true; // Set game over state
  }
}

void Logic::Tick() {
  if (isGameOver) return; // Do nothing if game is over

  Move(0, 1); // Gravity: Move Down 1

  // Check if the piece could move down. If not, it means it collided,
  // so lock it and spawn a new one.
  Piece next = currentPiece;
  next.y++;
  if (IsValidPosition(next)) {
    currentPiece = next;
  } else {
    LockPiece();
    SpawnPiece(); // This will now correctly use nextPiece and generate a new one.
  }
}

void Logic::Move(int dx, int dy) {
  if (isGameOver) return; // Cannot move if game is over

  Piece next = currentPiece;
  next.x += dx;
  next.y += dy;
  if (IsValidPosition(next)) {
    currentPiece = next;
  }
}

void Logic::Rotate() {
  if (isGameOver) return; // Cannot rotate if game is over

  Piece next = currentPiece;
  next.rotation = (next.rotation + 1) % 4;

  if (IsValidPosition(next)) {
    currentPiece = next;
  }
  // TODO: Add Wall Kick (try checking x-1, x+1, etc.)
}

bool Logic::IsValidPosition(const Piece &p) const {
  for (int i = 0; i < 4; i++) {
    int bx, by;
    p.GetBlock(p.rotation, i, bx, by);

    int boardX = p.x + bx;
    int boardY = p.y + by;

    // Check board boundaries
    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 ||
        boardY >= BOARD_HEIGHT)
      return false;

    // Check for collision with existing locked blocks on the board
    // This check is only performed if boardX and boardY are within valid bounds,
    // as guaranteed by the previous 'if' statement.
    if (board.GetCell(boardY, boardX) != 0)
      return false;
  }
  return true;
}

void Logic::LockPiece() {
  if (isGameOver) return; // Cannot lock if game is over

  for (int i = 0; i < 4; i++) {
    int bx, by;
    currentPiece.GetBlock(currentPiece.rotation, i, bx, by);

    int boardX = currentPiece.x + bx;
    int boardY = currentPiece.y + by;

    // Ensure coordinates are within board limits before setting cell
    if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 &&
        boardY < BOARD_HEIGHT) {
      board.SetCell(boardY, boardX, (int)currentPiece.type);
    }
  }
  CheckLines();
}

void Logic::CheckLines() {
  if (isGameOver) return; // Cannot check lines if game is over

  int linesClearedThisTurn = 0;

  for (int y = BOARD_HEIGHT - 1; y >= 0; y--) {
    bool full = true;
    for (int x = 0; x < BOARD_WIDTH; x++) {
      if (board.GetCell(y, x) == 0) {
        full = false;
        break;
      }
    }

    if (full) {
      linesClearedThisTurn++;
      // Shift all rows above down by one
      for (int r = y; r > 0; r--) {
        for (int c = 0; c < BOARD_WIDTH; c++) {
          board.SetCell(r, c, board.GetCell(r - 1, c));
        }
      }
      // Clear the top row
      for (int c = 0; c < BOARD_WIDTH; c++)
        board.SetCell(0, c, 0);

      y++; // Re-check the current row, as it now contains the row that was above it
    }
  }

  // Award points based on lines cleared
  if (linesClearedThisTurn > 0) {
    switch (linesClearedThisTurn) {
    case 1:
      score += 100;
      break;
    case 2:
      score += 300;
      break;
    case 3:
      score += 500;
      break;
    case 4:
      score += 800; // Tetris!
      break;
    default:
      // For more than 4 lines, apply a generic multiplier or specific rule
      score += linesClearedThisTurn * 100;
      break;
    }
  }
}

void Logic::Reset() {
  // Clear the board
  board.Reset();

  // Reset game state variables
  spawnCounter = 0;
  score = 0; // Reset score
  isGameOver = false;

  // Spawn a new piece to start the game
  // Re-initialize nextPiece and then spawn it.
  nextPiece = Piece(static_cast<PieceType>(distrib(gen)));
  nextPiece.x = 0;
  nextPiece.y = 0;
  nextPiece.rotation = 0;
  SpawnPiece();
}