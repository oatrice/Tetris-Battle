
#ifndef LOGIC_H
#define LOGIC_H

#include "board.h"
#include "piece.h"

const int BOARD_WIDTH = 10;
const int BOARD_HEIGHT = 20;

class Logic {
public:
  Logic();

  // Core Game Loop
  void Tick();
  void SpawnPiece();

  // Actions
  void Move(int dx, int dy);
  void Rotate();

  // Helpers
  bool IsValidPosition(const Piece &p) const;
  void LockPiece();
  void CheckLines();

  Board board;
  Piece currentPiece;
};

#endif