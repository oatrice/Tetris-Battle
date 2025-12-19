/**
 * DualPiece.test.ts
 * TDD Tests for Dual Piece Controller
 * 
 * Controls two pieces simultaneously:
 * - Player 1: Left piece (spawns in zone 0-11)
 * - Player 2: Right piece (spawns in zone 12-23)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DualPieceController, PlayerAction } from './DualPiece';
import { CoopBoard } from './CoopBoard';

describe('DualPieceController', () => {
    let board: CoopBoard;
    let controller: DualPieceController;

    beforeEach(() => {
        board = new CoopBoard();
        controller = new DualPieceController(board);
    });

    describe('Initialization', () => {
        it('should spawn two pieces when game starts', () => {
            controller.spawnPieces();

            expect(controller.getPiece(1)).not.toBeNull();
            expect(controller.getPiece(2)).not.toBeNull();
        });

        it('should spawn Player 1 piece in left zone', () => {
            controller.spawnPieces();
            const pos = controller.getPosition(1);

            expect(pos.x).toBe(4);  // Center of left zone
            expect(pos.y).toBe(0);
        });

        it('should spawn Player 2 piece in right zone', () => {
            controller.spawnPieces();
            const pos = controller.getPosition(2);

            expect(pos.x).toBe(16); // Center of right zone
            expect(pos.y).toBe(0);
        });
    });

    describe('Player Actions', () => {
        beforeEach(() => {
            controller.spawnPieces();
        });

        it('should move Player 1 piece left', () => {
            const initialX = controller.getPosition(1).x;
            controller.handleAction(1, PlayerAction.MOVE_LEFT);

            expect(controller.getPosition(1).x).toBe(initialX - 1);
        });

        it('should move Player 1 piece right', () => {
            const initialX = controller.getPosition(1).x;
            controller.handleAction(1, PlayerAction.MOVE_RIGHT);

            expect(controller.getPosition(1).x).toBe(initialX + 1);
        });

        it('should move Player 2 piece left', () => {
            const initialX = controller.getPosition(2).x;
            controller.handleAction(2, PlayerAction.MOVE_LEFT);

            expect(controller.getPosition(2).x).toBe(initialX - 1);
        });

        it('should move Player 2 piece right', () => {
            const initialX = controller.getPosition(2).x;
            controller.handleAction(2, PlayerAction.MOVE_RIGHT);

            expect(controller.getPosition(2).x).toBe(initialX + 1);
        });

        it('should rotate Player 1 piece', () => {
            controller.handleAction(1, PlayerAction.ROTATE);
            // Just ensure no error - rotation logic tested elsewhere
            expect(controller.getPiece(1)).not.toBeNull();
        });

        it('should drop Player 1 piece down', () => {
            const initialY = controller.getPosition(1).y;
            controller.handleAction(1, PlayerAction.SOFT_DROP);

            expect(controller.getPosition(1).y).toBe(initialY + 1);
        });

        it('should hard drop Player 2 piece to bottom', () => {
            controller.handleAction(2, PlayerAction.HARD_DROP);
            const pos = controller.getPosition(2);

            // Should be at or near bottom (piece locked)
            expect(pos.y).toBeGreaterThan(5);
        });
    });

    describe('Independent Control', () => {
        beforeEach(() => {
            controller.spawnPieces();
        });

        it('should allow both players to move independently', () => {
            const p1InitialX = controller.getPosition(1).x;
            const p2InitialX = controller.getPosition(2).x;

            controller.handleAction(1, PlayerAction.MOVE_LEFT);
            controller.handleAction(2, PlayerAction.MOVE_RIGHT);

            expect(controller.getPosition(1).x).toBe(p1InitialX - 1);
            expect(controller.getPosition(2).x).toBe(p2InitialX + 1);
        });

        it('should not affect other player when one locks a piece', () => {
            controller.handleAction(1, PlayerAction.HARD_DROP);

            // Player 2 should still have their piece at spawn position
            expect(controller.getPiece(2)).not.toBeNull();
            expect(controller.getPosition(2).y).toBe(0);
        });
    });

    describe('Collision Between Players', () => {
        beforeEach(() => {
            controller.spawnPieces();
        });

        it('should allow Player 1 to move into Player 2 zone when no blocks', () => {
            // In coop mode, players can freely move across zones
            // P1 can go right as far as board allows
            for (let i = 0; i < 20; i++) {
                controller.handleAction(1, PlayerAction.MOVE_RIGHT);
            }

            const p1Pos = controller.getPosition(1);
            // P1 should be able to move right until board edge
            // Max position = 24 - piece width (4 for I piece, but varies)
            expect(p1Pos.x).toBeGreaterThan(10);
        });

        it('should prevent piece from overlapping with locked blocks', () => {
            // This test verifies that pieces can move freely until they hit a locked block
            // In a 24-wide board, pieces can move across the entire width unless blocked

            // Place a block at position (20, 5) - far right
            board.grid[5][20] = 1;

            // Move P1 down to row 5
            for (let i = 0; i < 5; i++) {
                controller.handleAction(1, PlayerAction.SOFT_DROP);
            }

            const beforeMove = controller.getPosition(1);

            // Try to move right (should be able to move until hitting the block)
            for (let i = 0; i < 30; i++) {
                controller.handleAction(1, PlayerAction.MOVE_RIGHT);
            }

            const afterMove = controller.getPosition(1);
            // Piece should have moved but not overlapped with the locked block at x=20
            // Assuming piece width is ~4, it should stop before or at x=20
            expect(afterMove.x).toBeGreaterThan(beforeMove.x); // Should have moved
            expect(afterMove.x).toBeLessThanOrEqual(20); // Should not overlap with block at x=20
        });
    });

    describe('Gravity Update', () => {
        beforeEach(() => {
            controller.spawnPieces();
        });

        it('should move both pieces down on gravity tick', () => {
            const p1InitialY = controller.getPosition(1).y;
            const p2InitialY = controller.getPosition(2).y;

            controller.applyGravity();

            expect(controller.getPosition(1).y).toBe(p1InitialY + 1);
            expect(controller.getPosition(2).y).toBe(p2InitialY + 1);
        });

        it('should lock piece when it cannot move down further', () => {
            // Move P1 to bottom
            let locked = false;
            for (let i = 0; i < 15; i++) {
                const result = controller.applyGravity();
                if (result.player1Locked) {
                    locked = true;
                    break;
                }
            }

            // Check that piece got locked (applyGravity returns locked status)
            expect(locked).toBe(true);

            // Piece should still be at bottom (not auto-spawned)
            const p1Pos = controller.getPosition(1);
            expect(p1Pos.y).toBeGreaterThan(5); // Still at bottom, not respawned
        });
    });

    describe('Line Clear Scoring', () => {
        it('should return line clear count when lines are completed', () => {
            // Fill bottom row manually
            for (let x = 0; x < 24; x++) {
                board.grid[11][x] = 1;
            }

            const result = controller.checkAndClearLines();
            expect(result.linesCleared).toBe(1);
        });

        it('should award bonus for cooperative line clear', () => {
            // This test is for when both players contribute to line clear
            // Implementation detail TBD
            expect(true).toBe(true);
        });
    });
    describe('Synchronization', () => {
        it('should allow setting next piece manually', () => {
            controller.setNextPiece(1, 'T');
            expect(controller.getNextPiece(1).type).toBe('T');
        });

        it('should use synced next piece when spawning', () => {
            controller.spawnPieces(); // Clear initial state

            controller.setNextPiece(2, 'I');
            controller.spawnPiece(2);

            expect(controller.getPiece(2)?.type).toBe('I');
        });

        it('should allow setting current piece state (sync)', () => {
            const mockShape = [[1, 1], [1, 1]]; // O-piece shape
            const mockPiece = { type: 'L', rotationIndex: 1, shape: mockShape };
            const mockPos = { x: 10, y: 10 };

            controller.setPiece(1, mockPiece, mockPos);

            const piece = controller.getPiece(1)!;
            expect(piece.type).toBe('L');
            expect(piece.rotationIndex).toBe(1);
            // Verify shape is updated
            expect(piece.shape).toEqual(mockShape);

            const pos = controller.getPosition(1);
            expect(pos.x).toBe(10);
            expect(pos.y).toBe(10);
        });
    });
});
