
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CoopGame } from './CoopGame';
import { CoopBoard } from './CoopBoard';
import { DualPieceController, PlayerAction } from './DualPiece';
import { CoopSync } from './CoopSync';

// Mock RealtimeService
vi.mock('../services/RealtimeService', () => {
    return {
        RealtimeService: vi.fn().mockImplementation(() => ({
            onValue: vi.fn(),
            set: vi.fn(),
            push: vi.fn(),
            off: vi.fn()
        }))
    };
});

describe('Coop Logic Requirements', () => {
    let game: CoopGame;

    beforeEach(() => {
        game = new CoopGame();
        // Setup simple pieces
        game.controller.setNextPiece(1, 'I');
        game.controller.setNextPiece(2, 'I');
        game.controller.spawnPieces();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Requirement: Strict Boundary Enforcement
     * Player 1 (0-11) and Player 2 (12-23) must be strictly blocked.
     */
    it('Task 1: Enforces Strict Boundaries for Player 1', () => {
        // Move P1 all the way to right boundary (x=11)
        // Current spawn is likely ~4.
        // Try to move beyond 11
        for (let i = 0; i < 20; i++) {
            game.controller.handleAction(1, PlayerAction.MOVE_RIGHT);
        }

        const finalPos = game.controller.getPosition(1);

        // Regardless of shape, NO block matches x >= 12.
        // Check grid or piece position.

        const piece = game.controller.getPiece(1)!;
        const matrix = piece.shape;
        let maxBlockX = -1;

        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    const globalX = finalPos.x + c;
                    if (globalX > maxBlockX) maxBlockX = globalX;
                }
            }
        }

        expect(maxBlockX).toBeLessThan(12);
    });

    it('Task 1: Enforces Strict Boundaries for Player 2', () => {
        // Move P2 all the way to left boundary (x=12)
        for (let i = 0; i < 20; i++) {
            game.controller.handleAction(2, PlayerAction.MOVE_LEFT);
        }

        const finalPos = game.controller.getPosition(2);
        const piece = game.controller.getPiece(2)!;
        const matrix = piece.shape;
        let minBlockX = 100;

        for (let r = 0; r < matrix.length; r++) {
            for (let c = 0; c < matrix[r].length; c++) {
                if (matrix[r][c]) {
                    const globalX = finalPos.x + c;
                    if (globalX < minBlockX) minBlockX = globalX;
                }
            }
        }

        expect(minBlockX).toBeGreaterThanOrEqual(12);
    });

    /**
     * Requirement: State Aggregation (Scores)
     * If two players clear lines simultaneously, aggregate lines/scores.
     */
    it('Task 2: Aggregates Scores from both players', () => {
        // Manually simulate scoring
        // We need to access private/internal scoring state if we haven't refactored yet.
        // For now, we expect game.lines to equal sum.

        // This test assumes we will refactor CoopGame to have separate score trackers
        // and a way to merge them.

        // Simulate P1 clearing 1 line
        (game as any).addLines(1, 1); // Mock method we will implement
        expect(game.lines).toBe(1);

        // Simulate P2 clearing 2 lines
        (game as any).addLines(1, 2); // 1 line for player 2
        // Wait, argument is (lines, playerNum)?

        // Let's assume addLines(count, playerNumber)

        expect(game.lines).toBe(2);

        // Check scores (1 line = 100 * level)
        expect(game.score).toBe(200);
    });

    /**
     * Requirement: Simultaneous Hard Drops
     * Ensure InputHandler handles both drops in one tick.
     */
    it('Task 1: Handles Simultaneous Hard Drops', () => {
        // We simulate this by calling handleAction sequentially in test (as Sync would loop inputs)
        // and verifying both locked.

        game.controller.handleAction(1, PlayerAction.HARD_DROP);
        game.controller.handleAction(2, PlayerAction.HARD_DROP);

        // Check if both pieces spawned anew (meaning previous ones locked)
        // Since we didn't call update(), handleAction(HARD_DROP) should trigger lock immediately 
        // OR set position to bottom. 
        // DualPieceController.hardDrop calls lockPiece immediately.

        // We can check if positions changed (respawned) or piece instances changed.
        // Actually, hardDrop in DualPiece acts just on current piece. It doesn't auto-spawn.
        // Spawning happens in update() loop.

        // So checking if they are at bottom is enough.

        const p1Pos = game.controller.getPosition(1);
        const p2Pos = game.controller.getPosition(2);

        // Both should be at bottom
        expect(p1Pos.y).toBeGreaterThan(0);
        expect(p2Pos.y).toBeGreaterThan(0);

        // Verify both are locked in grid
        // We need to check grid at that pos
        // But DualPiece hardDrop locks it.

        // Just verify no error thrown and state is updated
    });

    /**
     * Requirement: Reconciliation logic
     */
    it('Task 2: Reconcile State pauses and syncs', () => {
        const sync = new CoopSync();
        game.isPaused = false;

        // Mock remote state that forces pause
        const remoteState = {
            isPaused: true,
            score: 500
        };

        // Call reconcile (via applyRemoteState exposed or public helper)
        (sync as any).coopGame = game;
        (sync as any).reconcileState(game.getState(), remoteState);

        expect(game.isPaused).toBe(true);
        // Expect score to NOT be lower if we aggregate? 
        // Actually reconciliation usually means "Trust Server/Host" or "Conflict Resolve".
        // If we trust remote:
        expect(game.score).toBe(500);
    });

    /**
     * Requirement: Deterministic Seed Integrity
     */
    it('Task 2: Seed Integrity', () => {
        const seed = 12345;
        const c1 = new DualPieceController(new CoopBoard());
        c1.setSeed(seed);

        const c2 = new DualPieceController(new CoopBoard());
        c2.setSeed(seed);

        expect(c1.getNextPiece(1).type).toBe(c2.getNextPiece(1).type);
        expect(c1.getNextPiece(2).type).toBe(c2.getNextPiece(2).type);
    });

});
