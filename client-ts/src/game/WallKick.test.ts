
import { describe, test, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameAction } from './InputHandler';
import { Tetromino } from './Tetromino';

describe('Wall Kicks (SRS)', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
        game.start();
        // Clear board just in case
        game.board.grid = Array(20).fill(null).map(() => Array(10).fill(0));
    });

    test('I-piece wall kick from right wall', () => {
        // Setup I-piece
        game.currentPiece = new Tetromino('I');

        // Rotate to Vertical (1 rotation CW from default horizontal)
        game.currentPiece.rotate();

        // Place at right edge
        // I-piece vertical occupies col 2. At x=7, occupies board col 9.
        game.position = { x: 7, y: 5 };

        // Verify initial state valid
        expect(game.board.isValidPosition(game.currentPiece, game.position.x, game.position.y)).toBe(true);
        const verticalShape = JSON.stringify(game.currentPiece.shape);

        // Perform Rotate CW (Vertical -> Horizontal)
        // Without wall kick, this would create collision at x=10 and revert.
        game.handleAction(GameAction.ROTATE_CW);

        // Assert rotation happened (shape changed)
        const newShape = JSON.stringify(game.currentPiece.shape);
        expect(newShape).not.toBe(verticalShape);

        // Check new position
        // Should have moved left
        expect(game.position.x).toBeLessThan(7);

        // Verify it is still valid on board
        expect(game.board.isValidPosition(game.currentPiece, game.position.x, game.position.y)).toBe(true);
    });

    test('T-piece floor kick', () => {
        game.currentPiece = new Tetromino('T');
        // T shape default (Rotation 0):
        // .#.
        // ###
        // ...
        // Bottom row of blocks is at index 1 of the shape (relative).

        // Place at bottom.
        // Board Height 20. Floor at y=20.
        // We want the piece to be valid, sitting on floor.
        // Piece Y position is top-left of 3x3 grid.
        // If Y=18. Rows: 18, 19, 20.
        // Shape Row 1 (###) is at 18+1 = 19. Valid.
        // Shape Row 2 (...) is at 20. Valid (empty).
        game.position = { x: 5, y: 18 };

        expect(game.board.isValidPosition(game.currentPiece, game.position.x, game.position.y)).toBe(true);
        const originalShape = JSON.stringify(game.currentPiece.shape); // store snapshot string

        // Rotate CW (0 -> 1).
        // New Shape:
        // .#.
        // .##
        // .#.
        // Consists of blocks at (1,0), (1,1), (2,1), (1,2).
        // Relative Y: 0, 1, 1, 2.
        // At Y=18. shape Y=2 becomes 18+2=20. COLLISION with floor.
        // Needs kick UP (dy = -1).

        // JLSTZ 0->1 Kicks (Y-Down): 
        // (0,0), (-1,0), (-1,-1), (0,2), (-1,2)
        // Check 1: (0,0) -> Y=20. Fail.
        // Check 2: (-1,0) -> x=4. Y=20. Fail.
        // Check 3: (-1,-1) -> x=4, y=17.
        // At y=17. Bottom block is 17+2=19. Valid.
        // So this should succeed.

        game.handleAction(GameAction.ROTATE_CW);

        // Expect rotation success
        expect(JSON.stringify(game.currentPiece.shape)).not.toBe(originalShape);

        // Expect moved Left and Up
        expect(game.position.x).toBe(4);
        expect(game.position.y).toBe(17);
    });
});
