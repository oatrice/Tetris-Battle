
#include "logic.h"
#include <iostream>
#include <random>

// Static random setup
static std::random_device rd;
static std::mt19937 gen(rd());
static std::uniform_int_distribution<> distrib(1, 7); // Types 1-7

Logic::Logic() { SpawnPiece(); }

void Logic::SpawnPiece() {
  // Random piece
  PieceType t = static_cast<PieceType>(distrib(gen));
  currentPiece = Piece(t);
  currentPiece.x = BOARD_WIDTH / 2 - 2; // Approximate center
  currentPiece.y = 0;
  currentPiece.rotation = 0;

  // Game Over Check
  if (!IsValidPosition(currentPiece)) {
    board.Reset(); // Simple restart for now
  }
}

void Logic::Tick() {
  Move(0, 1); // Gravity: Move Down 1
  // Note: Move() handles IsValid check.
  // If invalid (collision), we need to Lock.

  // Check if gravity move actually happened?
  // Wait, Move() updates currentPiece IF valid.
  // We need to know if it failed to Lock.

  Piece next = currentPiece;
  next.y++;
  if (IsValidPosition(next)) {
    currentPiece = next;
  } else {
    LockPiece();
    SpawnPiece();
  }
}

void Logic::Move(int dx, int dy) {
  Piece next = currentPiece;
  next.x += dx;
  next.y += dy;
  if (IsValidPosition(next)) {
    currentPiece = next;
  }
}

void Logic::Rotate() {
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
    p.GetBlock(p.rotation, i, bx, by); // Use updated Piece.h logic

    int boardX = p.x + bx;
    int boardY = p.y + by;

    // Boundaries
    if (boardX < 0 || boardX >= BOARD_WIDTH || boardY < 0 ||
        boardY >= BOARD_HEIGHT)
      return false;

    // Collision (Swap X,Y fixed)
    if (board.GetCell(boardY, boardX) != 0)
      return false;
  }
  return true;
}

void Logic::LockPiece() {
  for (int i = 0; i < 4; i++) {
    int bx, by;
    currentPiece.GetBlock(currentPiece.rotation, i, bx, by);

    int boardX = currentPiece.x + bx;
    int boardY = currentPiece.y + by;

    if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 &&
        boardY < BOARD_HEIGHT) {
      board.SetCell(boardY, boardX, (int)currentPiece.type);
    }
  }
  CheckLines();
}

void Logic::CheckLines() {
  for (int y = BOARD_HEIGHT - 1; y >= 0; y--) {
    bool full = true;
    for (int x = 0; x < BOARD_WIDTH; x++) {
      if (board.GetCell(y, x) == 0) {
        full = false;
        break;
      }
    }

    if (full) {
      // Shift Down
      for (int r = y; r > 0; r--) {
        for (int c = 0; c < BOARD_WIDTH; c++) {
          board.SetCell(r, c, board.GetCell(r - 1, c));
        }
      }
      // Clear Top
      for (int c = 0; c < BOARD_WIDTH; c++)
        board.SetCell(0, c, 0);

      y++; // Check same row again
    }
  }
}