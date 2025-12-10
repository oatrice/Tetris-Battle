#include "gtest/gtest.h"
#include "../logic.h"
#include "../board.h"
#include "../piece.h"

// Assume a simple piece for testing, e.g., a square or a line.
// For these tests, we'll rely on the default piece spawning and movement.

TEST(LogicTest, InitialPieceSpawned) {
    Logic logic;
    ASSERT_NE(logic.currentPiece.type, PieceType::NONE); // Check if a piece type is assigned
    ASSERT_EQ(logic.currentPiece.x, BOARD_WIDTH / 2 - 2); // Default spawn X
    ASSERT_EQ(logic.currentPiece.y, 0); // Default spawn Y
}

TEST(LogicTest, PieceMovesDownOnTick) {
    Logic logic;
    int initialY = logic.currentPiece.y;
    logic.Tick();
    ASSERT_EQ(logic.currentPiece.y, initialY + 1);
}

TEST(LogicTest, CollisionFloor) {
    Logic logic;
    // Spawn a piece and move it to the bottom-most valid position.
    // For simplicity, let's assume a piece that is 4 blocks high (like I or O piece).
    // The lowest possible Y for its top-left corner would be BOARD_HEIGHT - 4.
    // We'll just drop it until it can't move further.
    
    int lastY = logic.currentPiece.y;
    int prevY = -1; // To detect if it stopped moving

    // Drop the piece until it hits the floor or another piece
    while (logic.currentPiece.y != prevY) {
        prevY = logic.currentPiece.y;
        logic.Tick();
        if (logic.currentPiece.y == prevY) { // If Tick() didn't move it, it must have collided
            break;
        }
        lastY = logic.currentPiece.y;
    }
    
    // The piece should now be at its lowest valid position.
    // One more Tick() should NOT move it further down.
    int yBeforeFinalTick = logic.currentPiece.y;
    logic.Tick(); // This tick should attempt to move it and find it invalid.
    ASSERT_EQ(logic.currentPiece.y, yBeforeFinalTick); // Y should not have changed.
}

TEST(LogicTest, LockPiece) {
    Logic logic;
    
    // Store the initial piece's state before it drops
    Piece initialPiece = logic.currentPiece;
    
    // Drop the piece until it hits the floor or another piece
    int prevY = -1;
    while (logic.currentPiece.y != prevY) {
        prevY = logic.currentPiece.y;
        logic.Tick();
        if (logic.currentPiece.y == prevY) {
            break; // Piece stopped moving
        }
    }
    
    // At this point, the piece is at its lowest valid position.
    // The next Tick() should lock it and spawn a new piece.
    Piece pieceToLock = logic.currentPiece; // This is the piece at its final position
    logic.Tick(); // This should lock 'pieceToLock' and spawn a new one.

    // 1. Assert a new piece has been spawned
    ASSERT_NE(logic.currentPiece.type, pieceToLock.type); // New piece should be different type
    ASSERT_NE(logic.currentPiece.x, pieceToLock.x); // New piece should be at spawn x
    ASSERT_NE(logic.currentPiece.y, pieceToLock.y); // New piece should be at spawn y
    ASSERT_EQ(logic.currentPiece.x, BOARD_WIDTH / 2 - 2); // Check new piece spawn X
    ASSERT_EQ(logic.currentPiece.y, 0); // Check new piece spawn Y

    // 2. Assert the old piece's blocks are locked into the board
    // Iterate through the blocks of the 'pieceToLock' at its final position
    for (int rotation = 0; rotation < 4; ++rotation) { // Iterate through possible rotations (usually 0 for locked piece)
        for (int i = 0; i < 4; ++i) { // Each piece has up to 4 blocks
            int blockOffsetX, blockOffsetY;
            pieceToLock.GetBlock(rotation, i, blockOffsetX, blockOffsetY);
            
            // Calculate global coordinates of the block
            int boardX = pieceToLock.x + blockOffsetX;
            int boardY = pieceToLock.y + blockOffsetY;

            // Ensure coordinates are within board bounds before checking
            if (boardX >= 0 && boardX < BOARD_WIDTH && boardY >= 0 && boardY < BOARD_HEIGHT) {
                // Check if the board cell at this position is now occupied by the locked piece's type
                // Assuming GetBlock(0,i) is the correct representation for the locked piece
                pieceToLock.GetBlock(0, i, blockOffsetX, blockOffsetY); // Ensure we use rotation 0 for locked state
                boardX = pieceToLock.x + blockOffsetX;
                boardY = pieceToLock.y + blockOffsetY;
                ASSERT_EQ(logic.board.GetCell(boardX, boardY), static_cast<int>(pieceToLock.type));
            }
        }
    }
}

// Add more tests for collision with existing pieces, rotation, etc. later.