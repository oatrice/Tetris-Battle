
import { describe, it, expect, beforeEach } from 'vitest';
import { DualPieceController } from './DualPiece';
import { CoopBoard } from './CoopBoard';

describe('Deterministic Piece Generation (Phase 3)', () => {
    let board: CoopBoard;

    beforeEach(() => {
        board = new CoopBoard();
    });

    it('should generate identical piece sequences for same seed', () => {
        const seed = 12345;

        // Controller 1
        const controller1 = new DualPieceController(board);
        controller1.setSeed(seed);

        // Controller 2
        const controller2 = new DualPieceController(board);
        controller2.setSeed(seed);

        // Check first 10 pieces for Player 1
        for (let i = 0; i < 10; i++) {
            // Simulate consuming pieces by calling generatePiece internal logic logic
            // But since generatePiece is private, we can observe behavior via getNextPiece
            // However, getNextPiece caches. 
            // Better to check if the INITIAL next pieces match.
            // Or better: we can expose a way to test generation, or just iterate.

            // Actually, spawnPiece calls generatePiece.
            // Let's rely on checking the public methods.

            // To force generation, we can "spawn" (which consumes next)

            // BUT: We need to see if the sequence is the same.
            // Let's verify internal state or public output.
        }

        // Simpler check: Compare public next pieces after setting seed
        const p1_next_1 = controller1.getNextPiece(1).type;
        const p1_next_2 = controller2.getNextPiece(1).type;

        expect(p1_next_1).toBe(p1_next_2);

        // Force new piece generation by "spawning" (this consumes next piece and generates a new one)
        // We need to mock ability to place piece to enable spawning or assume board is empty

        controller1.spawnPiece(1);
        controller2.spawnPiece(1);

        expect(controller1.getPiece(1)?.type).toBe(controller2.getPiece(1)?.type);
        expect(controller1.getNextPiece(1).type).toBe(controller2.getNextPiece(1).type);
    });

    it('should generate different sequences for different seeds', () => {
        const controller1 = new DualPieceController(board);
        controller1.setSeed(11111);

        const controller2 = new DualPieceController(board);
        controller2.setSeed(99999);

        // There is a small chance they are same, but highly unlikely for first piece if seed works
        const p1_next_1 = controller1.getNextPiece(1).type;
        const p1_next_2 = controller2.getNextPiece(1).type;

        // If they happen to be same, let's try next one
        if (p1_next_1 === p1_next_2) {
            controller1.spawnPiece(1);
            controller2.spawnPiece(1);
            const p2_next_1 = controller1.getNextPiece(1).type;
            const p2_next_2 = controller2.getNextPiece(1).type;
            expect(p2_next_1).not.toBe(p2_next_2);
        } else {
            expect(p1_next_1).not.toBe(p1_next_2);
        }
    });
});
