import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board';
import { Tetromino } from './Tetromino';

describe('Board', () => {
    let board: Board;

    beforeEach(() => {
        board = new Board(10, 20);
    });

    it('should initialize with correct dimensions and empty grid', () => {
        // expect(board.width).toBe(10);
        // expect(board.height).toBe(20);
        // Grid should be 20 rows of 10 columns
        expect(board.grid.length).toBe(20);
        expect(board.grid[0].length).toBe(10);
        // Check if initialized to 0 (empty)
        expect(board.grid[19][9]).toBe(0);
    });

    it('should check valid position for a piece', () => {
        const piece = new Tetromino('O');
        // O shape is 2x2 box
        // Position 0,0 should be valid in empty board
        expect(board.isValidPosition(piece, 0, 0)).toBe(true);
    });

    it('should detect out of bounds (left/right/bottom)', () => {
        const piece = new Tetromino('O');

        // Left bound (x = -1)
        expect(board.isValidPosition(piece, -1, 0)).toBe(false);

        // Right bound (x = 9, O-piece width is 2, so occupying col 9 and 10. Col 10 is OOB)
        // Shape: [1,1] at x=9 => (9,0) and (10,0). (10,0) is invalid.
        expect(board.isValidPosition(piece, 9, 0)).toBe(false);

        // Bottom bound
        expect(board.isValidPosition(piece, 0, 20)).toBe(false);
    });

    it('should lock piece into grid', () => {
        const piece = new Tetromino('O');
        board.lockPiece(piece, 0, 18); // Bottom-left corner

        // O shape [1,1],[1,1]
        expect(board.grid[18][0]).not.toBe(0);
        expect(board.grid[18][1]).not.toBe(0);
        expect(board.grid[19][0]).not.toBe(0);
        expect(board.grid[19][1]).not.toBe(0);
    });

    it('should clear full lines', () => {
        // Fill bottom row except last cell
        for (let x = 0; x < 9; x++) {
            board.grid[19][x] = 1;
        }
        // No clear yet
        expect(board.clearLines().count).toBe(0);

        // Fill last cell
        board.grid[19][9] = 1;

        // Should clear 1 line
        expect(board.clearLines().count).toBe(1);

        // Bottom row should be empty (new row) or filled with row above (0)
        expect(board.grid[19][0]).toBe(0);
    });
});
