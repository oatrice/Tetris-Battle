
#include "board.h"

Board::Board() { Reset(); }

void Board::Reset() {
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      grid[i][j] = 0;
    }
  }
}

void Board::SetCell(int r, int c, int val) {
  if (r >= 0 && r < 20 && c >= 0 && c < 10) {
    grid[r][c] = val;
  }
}

int Board::GetCell(int r, int c) const {
  if (r >= 0 && r < 20 && c >= 0 && c < 10) {
    return grid[r][c];
  }
  return -1; // Out of bounds
}
