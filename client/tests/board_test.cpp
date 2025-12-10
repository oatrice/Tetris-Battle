
#include "../board.h"
#include <gtest/gtest.h>

// Test 1: Init
TEST(BoardTest, Initialization) {
  Board board;
  for (int i = 0; i < 20; i++) {
    for (int j = 0; j < 10; j++) {
      EXPECT_EQ(board.GetCell(i, j), 0);
    }
  }
}

// Test 2: Operation
TEST(BoardTest, SetAndGet) {
  Board board;
  board.SetCell(10, 5, 2);
  EXPECT_EQ(board.GetCell(10, 5), 2);
  // Neighbors shouldn't change
  EXPECT_EQ(board.GetCell(10, 6), 0);
}

// Test 3: Bounds Check
TEST(BoardTest, OutOfBounds) {
  Board board;
  EXPECT_EQ(board.GetCell(-1, 0), -1);
  EXPECT_EQ(board.GetCell(0, -1), -1);
  EXPECT_EQ(board.GetCell(20, 0), -1);
  EXPECT_EQ(board.GetCell(0, 10), -1);
}
