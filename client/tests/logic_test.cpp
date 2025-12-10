
#include "../logic.h"
#include <gtest/gtest.h>

TEST(TetrisLogicTest, SpawnPiece) {
  TetrisLogic game;
  game.SpawnPiece(1); // Type 1

  Piece p = game.GetActivePiece();
  EXPECT_EQ(p.type, 1);
  EXPECT_EQ(p.y, 0); // Start at top
  // Standard Tetris start X is usually center (width 10 -> index 3,4,5,6)
  // Let's expect X=4 for simplicity logic
  EXPECT_EQ(p.x, 4);
}

TEST(TetrisLogicTest, Gravity) {
  TetrisLogic game;
  game.SpawnPiece(1);

  // Initial Y=0
  EXPECT_EQ(game.GetActivePiece().y, 0);

  game.Tick(); // Drop
  EXPECT_EQ(game.GetActivePiece().y, 1);

  game.Tick(); // Drop again
  EXPECT_EQ(game.GetActivePiece().y, 2);
}
