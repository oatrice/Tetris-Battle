#ifndef LOGIC_H
#define LOGIC_H

#include "board.h"
#include "piece.h"

// Constants (can be moved to a config header later)
const int BOARD_WIDTH = 10;
const int BOARD_HEIGHT = 20;

class Logic {
public:
    Logic();
    void Tick(); // Advances game state by one frame/step
    void SpawnPiece(); // Spawns a new piece at the top
    bool IsValidPosition(const Piece& p) const; // Checks if a piece's position is valid
    void LockPiece(); // Locks the current piece into the board

    Board board;
    Piece currentPiece;
};

#endif // LOGIC_H