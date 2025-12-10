
#pragma once
#include <vector>

enum class PieceType { NONE = 0, I, O, T, S, Z, J, L };

struct Piece {
  int x, y;
  int rotation; // 0, 1, 2, 3
  PieceType type;
  int color_id;

  Piece() : x(0), y(0), rotation(0), type(PieceType::NONE), color_id(0) {}
  Piece(PieceType t, int _x, int _y)
      : x(_x), y(_y), rotation(0), type(t), color_id((int)t) {}

  // Get block offsets relative to piece origin (Top-Left 0,0)
  // Using Standard Tetris Rotation (SRS) simplified
  void GetBlock(int rot, int index, int &outX, int &outY) const {
    // Shapes definitions (Local Coordinates)
    // Array: [Type][Rotation][BlockIndex][x,y] defined implicitly via logic or
    // table Simplified: Just 0 rotation for now to fix the "Strange line" look
    // first.

    static const int shapes[8][4][2] = {
        {{0, 0}, {0, 0}, {0, 0}, {0, 0}}, // NONE
        {{0, 1},
         {1, 1},
         {2, 1},
         {3, 1}}, // I (Horizontal line for visual clarity)
        {{1, 0}, {2, 0}, {1, 1}, {2, 1}}, // O (Box)
        {{1, 0}, {0, 1}, {1, 1}, {2, 1}}, // T
        {{1, 0}, {2, 0}, {0, 1}, {1, 1}}, // S
        {{0, 0}, {1, 0}, {1, 1}, {2, 1}}, // Z
        {{0, 0}, {0, 1}, {1, 1}, {2, 1}}, // J
        {{2, 0}, {0, 1}, {1, 1}, {2, 1}}  // L
    };

    // TODO: Add full rotation support later.
    // For now, let's make them look correct at spawn (Rotation 0).
    int t = (int)type;
    if (t < 0 || t > 7)
      t = 0;

    outX = shapes[t][index][0];
    outY = shapes[t][index][1];
  }
};
