#include "logic.h"

TetrisLogic::TetrisLogic() { activePiece = {0, 0, 0}; }

void TetrisLogic::SpawnPiece(int type) {
  activePiece.type = type;
  activePiece.x = 4; // Center (assuming width 10)
  activePiece.y = 0; // Top
}

void TetrisLogic::Tick() {
  // Basic Gravity
  activePiece.y += 1;
}

Piece TetrisLogic::GetActivePiece() const { return activePiece; }

const Board &TetrisLogic::GetBoard() const { return board; }
