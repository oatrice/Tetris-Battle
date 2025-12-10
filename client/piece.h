#pragma once

enum class PieceType { NONE = 0, I, O, T, S, Z, J, L };

struct Piece {
  int x, y;
  int rotation; // 0, 1, 2, 3
  PieceType type;
  int color_id;

  Piece() : x(0), y(0), rotation(0), type(PieceType::NONE), color_id(0) {}
  Piece(PieceType t, int _x = 0, int _y = 0)
      : x(_x), y(_y), rotation(0), type(t), color_id((int)t) {}

  // SRS Rotation Data
  // [PieceType][Rotation][BlockIndex][x,y]
  // 8 types * 4 rotations * 4 blocks * 2 coords
  void GetBlock(int rot, int index, int &outX, int &outY) const {
    // Simplified SRS Offsets (Relative to Top-Left of bounding box)
    // I: 4x4, O: 2x2 (Fixed), Others: 3x3

    static const int shapes[8][4][4][2] = {
        // NONE
        {{{0, 0}, {0, 0}, {0, 0}, {0, 0}},
         {{0, 0}, {0, 0}, {0, 0}, {0, 0}},
         {{0, 0}, {0, 0}, {0, 0}, {0, 0}},
         {{0, 0}, {0, 0}, {0, 0}, {0, 0}}},

        // I (Cyan) - 4x4 Bounding Box
        {
            {{0, 1}, {1, 1}, {2, 1}, {3, 1}}, // Rot 0
            {{2, 0}, {2, 1}, {2, 2}, {2, 3}}, // Rot 1
            {{0, 2}, {1, 2}, {2, 2}, {3, 2}}, // Rot 2
            {{1, 0}, {1, 1}, {1, 2}, {1, 3}}  // Rot 3
        },

        // O (Yellow) - 2x2 (Does not rotate visually, but logic needs entry)
        {{{1, 0}, {2, 0}, {1, 1}, {2, 1}},
         {{1, 0}, {2, 0}, {1, 1}, {2, 1}},
         {{1, 0}, {2, 0}, {1, 1}, {2, 1}},
         {{1, 0}, {2, 0}, {1, 1}, {2, 1}}},

        // T (Purple) - 3x3
        {
            {{1, 0}, {0, 1}, {1, 1}, {2, 1}}, // Rot 0 (Up)
            {{1, 0}, {1, 1}, {1, 2}, {2, 1}}, // Rot 1 (Right)
            {{0, 1}, {1, 1}, {2, 1}, {1, 2}}, // Rot 2 (Down)
            {{1, 0}, {0, 1}, {1, 1}, {1, 2}}  // Rot 3 (Left)
        },

        // S (Green)
        {{{1, 0}, {2, 0}, {0, 1}, {1, 1}},
         {{1, 0}, {1, 1}, {2, 1}, {2, 2}},
         {{1, 1}, {2, 1}, {0, 2}, {1, 2}},
         {{0, 0}, {0, 1}, {1, 1}, {1, 2}}},

        // Z (Red)
        {{{0, 0}, {1, 0}, {1, 1}, {2, 1}},
         {{2, 0}, {1, 1}, {2, 1}, {1, 2}},
         {{0, 1}, {1, 1}, {1, 2}, {2, 2}},
         {{1, 0}, {0, 1}, {1, 1}, {0, 2}}},

        // J (Blue)
        {
            {{0, 0}, {0, 1}, {1, 1}, {2, 1}}, // Rot 0
            {{1, 0}, {2, 0}, {1, 1}, {1, 2}}, // Rot 1
            {{0, 1}, {1, 1}, {2, 1}, {2, 2}}, // Rot 2
            {{1, 0}, {1, 1}, {0, 2}, {1, 2}}  // Rot 3
        },

        // L (Orange)
        {{{2, 0}, {0, 1}, {1, 1}, {2, 1}},
         {{1, 0}, {1, 1}, {1, 2}, {2, 2}},
         {{0, 1}, {1, 1}, {2, 1}, {0, 2}},
         {{0, 0}, {1, 0}, {1, 1}, {1, 2}}}};

    int t = (int)type;
    if (t < 0 || t > 7)
      t = 0;
    int r = rot % 4;
    if (r < 0)
      r += 4;

    outX = shapes[t][r][index][0];
    outY = shapes[t][r][index][1];
  }
};