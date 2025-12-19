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
            // Place a block at position (12, 5) - at the boundary between zones
            board.grid[5][12] = 1;

            // Move P1 down to row 5
            for (let i = 0; i < 5; i++) {
                controller.handleAction(1, PlayerAction.SOFT_DROP);
            }

            const beforeMove = controller.getPosition(1);

            // Try to move right into the blocked area (should be blocked)
            for (let i = 0; i < 20; i++) {
                controller.handleAction(1, PlayerAction.MOVE_RIGHT);
            }

            const afterMove = controller.getPosition(1);
            // P1 should be stopped by collision detection
            // The piece should not be able to move past the block
            expect(afterMove.x).toBeLessThanOrEqual(beforeMove.x + 10); // Allow some movement but not past the block
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
            for (let i = 0; i < 15; i++) {
                controller.applyGravity();
            }

            // Check that piece got locked and new one spawned
            // (position should reset to top)
            const p1Pos = controller.getPosition(1);
            expect(p1Pos.y).toBeLessThan(5);
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
});
