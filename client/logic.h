
#pragma once
#include "board.h"

struct Piece {
  int x, y;
  int type; // 0=None, 1..7=Shapes
};

class TetrisLogic {
public:
  TetrisLogic();
  void SpawnPiece(int type);
  void Tick(); // Move active piece down
  Piece GetActivePiece() const;
  const Board &GetBoard() const;

private:
  Board board;
  Piece activePiece;
};
