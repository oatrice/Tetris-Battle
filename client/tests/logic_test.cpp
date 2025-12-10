
#include "../board.h"
#include "../logic.h"
#include "../piece.h"
#include "gtest/gtest.h"

// Helper fixture
class LogicTest : public ::testing::Test {
protected:
  Logic logic;

  void SetUp() override {
    logic.board.Reset();
    logic.currentPiece = Piece(PieceType::I);
    logic.currentPiece.x = BOARD_WIDTH / 2 - 2;
    logic.currentPiece.y = 0;
    logic.currentPiece.rotation = 0;
  }

  // Helper to fill a row
  void FillRow(int row_idx) {
    for (int c = 0; c < BOARD_WIDTH; ++c)
      logic.board.SetCell(row_idx, c, 1);
  }

  // Check empty row
  bool IsRowEmpty(int row_idx) {
    for (int c = 0; c < BOARD_WIDTH; ++c) {
      if (logic.board.GetCell(row_idx, c) != 0)
        return false;
    }
    return true;
  }
};

TEST_F(LogicTest, MoveLeft) {
  int initialX = logic.currentPiece.x;
  logic.Move(-1, 0);
  ASSERT_EQ(logic.currentPiece.x, initialX - 1);
}

TEST_F(LogicTest, MoveRight) {
  int initialX = logic.currentPiece.x;
  logic.Move(1, 0);
  ASSERT_EQ(logic.currentPiece.x, initialX + 1);
}

TEST_F(LogicTest, Rotate) {
  logic.Rotate();
  ASSERT_EQ(logic.currentPiece.rotation, 1);
  logic.Rotate();
  ASSERT_EQ(logic.currentPiece.rotation, 2);
}

TEST_F(LogicTest, LineClear) {
  // Fill bottom row
  FillRow(BOARD_HEIGHT - 1);

  // Put a piece that doesn't conflict, then simulate a lock that triggers
  // checklines Actually, CheckLines() is called inside LockPiece(). We can test
  // CheckLines() directly or via Turn.

  // Let's call CheckLines() directly to test logic
  logic.CheckLines();

  // Bottom row should be cleared (empty) because we filled it and CheckLines
  // runs
  ASSERT_TRUE(IsRowEmpty(BOARD_HEIGHT - 1));
}

TEST_F(LogicTest, CollisionTest) {
  logic.currentPiece.x = 0;
  logic.Move(-1, 0);                  // Wall kick left
  ASSERT_EQ(logic.currentPiece.x, 0); // Should stick
}