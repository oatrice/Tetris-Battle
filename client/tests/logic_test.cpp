#include "gtest/gtest.h"
#include "../logic.h"
#include "../board.h" // Assuming board.h defines Board class
#include "../piece.h" // Assuming piece.h defines Piece class

// Mocking Piece and Board if necessary for deeper control,
// but for now, assume their public interfaces are sufficient.

// Helper function to create a logic instance with a specific initial piece
Logic CreateLogicWithPiece(Piece::Type type, int x, int y, int rotation = 0) {
    Logic logic;
    logic.currentPiece = Piece(type);
    logic.currentPiece.x = x;
    logic.currentPiece.y = y;
    logic.currentPiece.rotation = rotation;
    // Clear the board for a clean test
    logic.board = Board(BOARD_WIDTH, BOARD_HEIGHT);
    return logic;
}

// Test fixture for Logic class
class LogicTest : public ::testing::Test {
protected:
    Logic logic;

    void SetUp() override {
        // Default setup for each test
        logic.board = Board(BOARD_WIDTH, BOARD_HEIGHT); // Ensure clean board
        logic.currentPiece = Piece(Piece::Type::I); // Default piece
        logic.currentPiece.x = BOARD_WIDTH / 2 - 2;
        logic.currentPiece.y = 0;
        logic.currentPiece.rotation = 0;
    }

    // Helper to fill a row on the board
    void FillRow(int row_idx, int value = 1) {
        for (int col = 0; col < BOARD_WIDTH; ++col) {
            logic.board.SetCell(row_idx, col, value);
        }
    }

    // Helper to check if a row is empty
    bool IsRowEmpty(int row_idx) {
        for (int col = 0; col < BOARD_WIDTH; ++col) {
            if (logic.board.GetCell(row_idx, col) != 0) {
                return false;
            }
        }
        return true;
    }
};

TEST_F(LogicTest, MoveLeft) {
    // Initial position
    int initialX = logic.currentPiece.x;
    logic.Move(-1, 0);
    ASSERT_EQ(logic.currentPiece.x, initialX - 1); // Should move left

    // Test moving left into a wall
    // Move piece to the far left
    logic.currentPiece.x = 0;
    logic.Move(-1, 0);
    ASSERT_EQ(logic.currentPiece.x, 0); // Should not move past the wall (x < 0)

    // Test moving left into an existing block
    // Place a block at (initialX - 2, currentPiece.y)
    // Assuming currentPiece is 'I' type, it spans 4 cells.
    // If currentPiece.x is 4, blocks are at 4,5,6,7.
    // Moving left by 1 means blocks would be at 3,4,5,6.
    // If there's a block at 3, currentX should be 4.
    logic.currentPiece.x = BOARD_WIDTH / 2; // e.g., 5
    int blockToPlaceX = logic.currentPiece.x - 1; // e.g., 4
    int blockToPlaceY = logic.currentPiece.y;
    // Find the actual leftmost block position of the I piece
    int pieceLeftmostLocalX = 0; // for I piece at rotation 0
    // Place a block on the board where the piece would move into
    logic.board.SetCell(blockToPlaceY, blockToPlaceX + pieceLeftmostLocalX, 1);
    
    int originalX = logic.currentPiece.x;
    logic.Move(-1, 0);
    ASSERT_EQ(logic.currentPiece.x, originalX); // Should not move if blocked
    logic.board.SetCell(blockToPlaceY, blockToPlaceX + pieceLeftmostLocalX, 0); // Clean up
}

TEST_F(LogicTest, MoveRight) {
    // Initial position
    int initialX = logic.currentPiece.x;
    logic.Move(1, 0);
    ASSERT_EQ(logic.currentPiece.x, initialX + 1); // Should move right

    // Test moving right into a wall
    // Move piece to the far right (I piece is 4 wide, x needs to be BOARD_WIDTH - 4)
    logic.currentPiece.x = BOARD_WIDTH - 4;
    logic.Move(1, 0);
    ASSERT_EQ(logic.currentPiece.x, BOARD_WIDTH - 4); // Should not move past the wall (x + 4 >= BOARD_WIDTH)

    // Test moving right into an existing block
    // Place a block at (initialX + 4, currentPiece.y)
    logic.currentPiece.x = BOARD_WIDTH / 2; // e.g., 5
    int blockToPlaceX = logic.currentPiece.x + 4; // e.g., 9 (rightmost block of piece is at 5+3=8)
    int blockToPlaceY = logic.currentPiece.y;
    // Place a block on the board where the piece would move into
    logic.board.SetCell(blockToPlaceY, blockToPlaceX, 1);

    int originalX = logic.currentPiece.x;
    logic.Move(1, 0);
    ASSERT_EQ(logic.currentPiece.x, originalX); // Should not move if blocked
    logic.board.SetCell(blockToPlaceY, blockToPlaceX, 0); // Clean up
}

TEST_F(LogicTest, Rotate) {
    // Test initial rotation 0 -> 1
    int initialRotation = logic.currentPiece.rotation; // 0
    logic.Rotate();
    ASSERT_EQ(logic.currentPiece.rotation, (initialRotation + 1) % 4); // Should be 1

    // Test rotation 1 -> 2
    initialRotation = logic.currentPiece.rotation; // 1
    logic.Rotate();
    ASSERT_EQ(logic.currentPiece.rotation, (initialRotation + 1) % 4); // Should be 2

    // Test rotation 3 -> 0 (wrap around)
    logic.currentPiece.rotation = 3;
    initialRotation = logic.currentPiece.rotation; // 3
    logic.Rotate();
    ASSERT_EQ(logic.currentPiece.rotation, (initialRotation + 1) % 4); // Should be 0

    // Test rotation blocked by wall
    logic.currentPiece = Piece(Piece::Type::I); // I piece, 4x4
    logic.currentPiece.x = BOARD_WIDTH - 1; // Position it against the right wall
    logic.currentPiece.y = 0;
    logic.currentPiece.rotation = 0; // I piece is horizontal

    int originalRotation = logic.currentPiece.rotation; // 0
    logic.Rotate(); // Try to rotate to 90 deg (vertical). This would extend past BOARD_WIDTH.
    ASSERT_EQ(logic.currentPiece.rotation, originalRotation); // Should not rotate
    
    // Test rotation blocked by existing block
    logic.currentPiece = Piece(Piece::Type::O); // O piece, 2x2, simpler for block collision
    logic.currentPiece.x = BOARD_WIDTH / 2;
    logic.currentPiece.y = 0;
    logic.currentPiece.rotation = 0; // O piece doesn't change on rotation, but for the test...

    // Place a block where the O piece would try to rotate into (even if it doesn't change shape)
    // Let's use an L piece for a more realistic rotation test
    logic.currentPiece = Piece(Piece::Type::L);
    logic.currentPiece.x = 0; // Place it left
    logic.currentPiece.y = 0;
    logic.currentPiece.rotation = 0; // L piece, default shape

    // Place a block where its rotated form would collide
    // L piece at (0,0), rot 0: blocks (0,0), (0,1), (0,2), (1,2)
    // Rotated 90 deg (rot 1): blocks (0,2), (1,2), (2,2), (2,1) relative to its 4x4 grid
    // Board positions for rot 1: (0,2), (1,2), (2,2), (2,1) assuming piece.x=0, piece.y=0
    // Let's block (2,1)
    logic.board.SetCell(logic.currentPiece.y + 1, logic.currentPiece.x + 2, 1); // Block at board (1,2)

    originalRotation = logic.currentPiece.rotation; // 0
    logic.Rotate();
    ASSERT_EQ(logic.currentPiece.rotation, originalRotation); // Should not rotate due to collision
    logic.board.SetCell(logic.currentPiece.y + 1, logic.currentPiece.x + 2, 0); // Clean up
}

TEST_F(LogicTest, LineClearSingleRow) {
    // Fill a row near the bottom
    int filledRow = BOARD_HEIGHT - 1;
    FillRow(filledRow);

    // Spawn a piece and lock it right above the filled row
    logic.currentPiece = Piece(Piece::Type::I); // I piece is 1x4 (vert) or 4x1 (horiz)
    logic.currentPiece.x = 0; // Place it left
    logic.currentPiece.y = filledRow - 1; // Place it just above the filled row
    logic.currentPiece.rotation = 0; // Horizontal I piece, so it sits on row `filledRow - 1`

    // Lock the piece. This should trigger CheckLines().
    logic.LockPiece();

    // The row `filledRow` should now be empty
    ASSERT_TRUE(IsRowEmpty(filledRow));
    // The row above it (which was `filledRow - 1`) should now be the new `filledRow`
    // The piece that was locked should now be at `filledRow`.
    // Let's check a cell that was part of the locked piece on `filledRow - 1`
    ASSERT_EQ(logic.board.GetCell(filledRow, 0), Piece::Type::I); // Assuming piece type value is used as cell value

    // The top row should be empty
    ASSERT_TRUE(IsRowEmpty(0));
}

TEST_F(LogicTest, LineClearMultipleRows) {
    // Fill two rows near the bottom
    int filledRow1 = BOARD_HEIGHT - 1;
    int filledRow2 = BOARD_HEIGHT - 2;
    FillRow(filledRow1);
    FillRow(filledRow2);

    // Fill a row above them with some blocks, but not full, to test shifting
    int rowAboveFilled = BOARD_HEIGHT - 3;
    logic.board.SetCell(rowAboveFilled, 0, 1);
    logic.board.SetCell(rowAboveFilled, 1, 1);

    // Spawn a piece and lock it, triggering line clear
    logic.currentPiece = Piece(Piece::Type::O); // O piece, 2x2
    logic.currentPiece.x = BOARD_WIDTH / 2 - 1;
    logic.currentPiece.y = BOARD_HEIGHT - 4; // Lock it above rowAboveFilled
    logic.LockPiece();

    // Both `filledRow1` and `filledRow2` should be empty
    ASSERT_TRUE(IsRowEmpty(BOARD_HEIGHT - 1));
    ASSERT_TRUE(IsRowEmpty(BOARD_HEIGHT - 2));

    // The row that was `rowAboveFilled` (BOARD_HEIGHT - 3) should now be at `BOARD_HEIGHT - 1`
    // And the O piece should be at `BOARD_HEIGHT - 3`
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 1, 0), 1); // Check block from rowAboveFilled
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 1, 1), 1);

    // The O piece should have locked at BOARD_HEIGHT - 3 (original y)
    // After two lines cleared, it should have moved down 2 rows.
    // Its blocks should now be at BOARD_HEIGHT - 3 (original y + 2 for cleared rows)
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 3, logic.currentPiece.x), Piece::Type::O);
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 3, logic.currentPiece.x + 1), Piece::Type::O);
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 2, logic.currentPiece.x), Piece::Type::O);
    ASSERT_EQ(logic.board.GetCell(BOARD_HEIGHT - 2, logic.currentPiece.x + 1), Piece::Type::O);

    // The top rows should be empty
    ASSERT_TRUE(IsRowEmpty(0));
    ASSERT_TRUE(IsRowEmpty(1));
}

TEST_F(LogicTest, LineClearNoRows) {
    // Fill a row partially
    int partialRow = BOARD_HEIGHT - 1;
    for (int col = 0; col < BOARD_WIDTH - 1; ++col) {
        logic.board.SetCell(partialRow, col, 1);
    }

    // Spawn and lock a piece
    logic.currentPiece = Piece(Piece::Type::T);
    logic.currentPiece.x = BOARD_WIDTH / 2;
    logic.currentPiece.y = BOARD_HEIGHT - 3;
    logic.LockPiece();

    // The partially filled row should remain as is
    ASSERT_EQ(logic.board.GetCell(partialRow, 0), 1);
    ASSERT_EQ(logic.board.GetCell(partialRow, BOARD_WIDTH - 1), 0); // Should still be empty

    // The piece should be locked at its position
    ASSERT_EQ(logic.board.GetCell(logic.currentPiece.y + 1, logic.currentPiece.x), Piece::Type::T);
}