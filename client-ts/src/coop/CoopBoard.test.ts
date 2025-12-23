/**
 * CoopBoard.test.ts
 * TDD Tests for Horizontal Coop Board (24w x 12h)
 * 
 * Board Layout:
 * ┌────────────────────────┐
 * │  P1 Zone  │  P2 Zone   │  ← 24 columns, 12 rows
 * │  (0-11)   │  (12-23)   │
 * └────────────────────────┘
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CoopBoard } from './CoopBoard';

describe('CoopBoard', () => {
    let board: CoopBoard;

    beforeEach(() => {
        board = new CoopBoard();
    });

    describe('Initialization', () => {
        it('should create a horizontal board with 24 columns and 12 rows', () => {
            expect(board.width).toBe(24);
            expect(board.height).toBe(12);
        });

        it('should initialize all cells as empty (0)', () => {
            for (let y = 0; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    expect(board.grid[y][x]).toBe(0);
                }
            }
        });

        it('should have grid dimensions matching height x width', () => {
            expect(board.grid.length).toBe(12);       // rows
            expect(board.grid[0].length).toBe(24);    // columns
        });
    });

    describe('Player Zones', () => {
        it('should define Player 1 zone as columns 0-11', () => {
            expect(board.getPlayerZone(1)).toEqual({ startX: 0, endX: 11 });
        });

        it('should define Player 2 zone as columns 12-23', () => {
            expect(board.getPlayerZone(2)).toEqual({ startX: 12, endX: 23 });
        });

        it('should return spawn position for Player 1 at center of their zone', () => {
            // Center of columns 0-11 = column 5 (for a 4-wide piece)
            const spawn = board.getSpawnPosition(1);
            expect(spawn.x).toBe(4);  // Start at column 4 for centered 4-wide piece
            expect(spawn.y).toBe(0);  // Top of board
        });

        it('should return spawn position for Player 2 at center of their zone', () => {
            // Center of columns 12-23 = column 16 (for a 4-wide piece)
            const spawn = board.getSpawnPosition(2);
            expect(spawn.x).toBe(16); // Start at column 16 for centered 4-wide piece
            expect(spawn.y).toBe(0);  // Top of board
        });
    });

    describe('Collision Detection', () => {
        it('should detect piece within board bounds as valid', () => {
            const mockPiece = { shape: [[1, 1], [1, 1]] }; // 2x2 O-piece
            expect(board.isValidPosition(mockPiece, 0, 0)).toBe(true);
            expect(board.isValidPosition(mockPiece, 22, 10)).toBe(true);
        });

        it('should detect piece outside left bound as invalid', () => {
            const mockPiece = { shape: [[1, 1], [1, 1]] };
            expect(board.isValidPosition(mockPiece, -1, 0)).toBe(false);
        });

        it('should detect piece outside right bound as invalid', () => {
            const mockPiece = { shape: [[1, 1], [1, 1]] };
            expect(board.isValidPosition(mockPiece, 23, 0)).toBe(false); // Would extend to column 24
        });

        it('should detect piece outside bottom bound as invalid', () => {
            const mockPiece = { shape: [[1, 1], [1, 1]] };
            expect(board.isValidPosition(mockPiece, 0, 11)).toBe(false); // Would extend to row 12
        });

        it('should detect collision with existing blocks', () => {
            board.grid[5][5] = 1; // Place a block
            const mockPiece = { shape: [[1, 1], [1, 1]] };
            expect(board.isValidPosition(mockPiece, 4, 4)).toBe(false); // Overlaps with (5,5)
        });
    });

    describe('Line Clear (Horizontal)', () => {
        it('should clear a full row and return count 1', () => {
            // Fill row 11 (bottom row)
            for (let x = 0; x < 24; x++) {
                board.grid[11][x] = 1;
            }

            const result = board.clearLines();
            expect(result.count).toBe(1);
            expect(result.indices).toContain(11);
        });

        it('should shift rows down after clearing', () => {
            // Fill row 11 completely
            for (let x = 0; x < 24; x++) {
                board.grid[11][x] = 1;
            }
            // Put a block in row 10
            board.grid[10][5] = 1;

            board.clearLines();

            // After clear, the block from row 10 should now be in row 11
            expect(board.grid[11][5]).toBe(1);
            // Row 0 should be empty (new row added at top)
            expect(board.grid[0].every(cell => cell === 0)).toBe(true);
        });

        it('should clear multiple full rows at once', () => {
            // Fill rows 10 and 11
            for (let x = 0; x < 24; x++) {
                board.grid[10][x] = 1;
                board.grid[11][x] = 1;
            }

            const result = board.clearLines();
            expect(result.count).toBe(2);
        });

        it('should not clear partial rows', () => {
            // Fill row 11 except one cell
            for (let x = 0; x < 23; x++) {
                board.grid[11][x] = 1;
            }
            board.grid[11][23] = 0; // Leave one empty

            const result = board.clearLines();
            expect(result.count).toBe(0);
        });
    });

    describe('Lock Piece', () => {
        it('should lock a piece onto the board at given position', () => {
            const mockPiece = {
                shape: [[1, 1], [1, 1]],
                type: 'O'
            };

            board.lockPiece(mockPiece, 5, 5);

            expect(board.grid[5][5]).toBe(1);
            expect(board.grid[5][6]).toBe(1);
            expect(board.grid[6][5]).toBe(1);
            expect(board.grid[6][6]).toBe(1);
        });
    });
});
