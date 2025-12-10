
#pragma once

enum class PieceType { NONE = 0, I, O, T, S, Z, J, L };

struct Piece {
  int x, y;
  int rotation; // 0, 1, 2, 3
  PieceType type;
  int color_id; // For visual logic if needed

  Piece() : x(0), y(0), rotation(0), type(PieceType::NONE), color_id(0) {}
  Piece(PieceType t, int _x, int _y)
      : x(_x), y(_y), rotation(0), type(t), color_id((int)t) {}

  // Get relative coordinates of the 4 blocks making up the tetromino
  // This is a simplified version. In real game, we'd use a lookup table.
  void GetBlock(int rot, int index, int &outX, int &outY) const {
    // Simple placeholder logic for testing Collision
    // Assumption: Just return a 1x1 block or a vertical line based on index
    // TODO: Implement full SRS rotation table later

    // For now, let's treat every piece as a vertical line of 4 blocks for
    // Collision Test (x, y), (x, y+1), (x, y+2), (x, y+3)
    outX = 0;
    outY = index;
  }
};
