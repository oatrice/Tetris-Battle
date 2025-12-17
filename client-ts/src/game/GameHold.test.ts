
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameAction } from './InputHandler';

describe('Game Hold Mechanic', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
        game.start();
    });

    it('should hold the current piece and spawn the next one', () => {
        const initialCurrent = game.currentPiece;
        const initialNext = game.nextPiece;

        expect(initialCurrent).not.toBeNull();
        expect(game.holdPiece).toBeNull(); // Initially null (TS will complain likely, or logic fail)

        game.handleAction(GameAction.HOLD);

        // Check if holdPiece is now what currentPiece was
        expect(game.holdPiece).not.toBeNull();
        expect(game.holdPiece?.type).toBe(initialCurrent?.type);

        // Check if currentPiece is now what nextPiece was
        expect(game.currentPiece?.type).toBe(initialNext?.type);

        // Check if a new next piece was generated (not strictly required to be unique, but should exist)
        expect(game.nextPiece).not.toBeNull();
    });

    it('should swap current piece with held piece', () => {
        // 1. First Hold
        const firstPiece = game.currentPiece;
        game.handleAction(GameAction.HOLD);
        expect(game.holdPiece?.type).toBe(firstPiece?.type);

        // Fast forward to next turn (lock current piece)
        // We need to simulate a lock or justforce it.
        // But for this specific test, we want to test the SWAP logic.
        // However, we can't hold twice in same turn. So we need to ensure we can't swap immediately.

        // 2. Lock the piece to reset "canHold"
        game.handleAction(GameAction.HARD_DROP);

        // Now currentPiece is a new piece (from spawn)
        const secondPiece = game.currentPiece;
        const heldPiece = game.holdPiece;

        // 3. Second Hold (Swap)
        game.handleAction(GameAction.HOLD);

        // currentPiece should now be the originally held piece
        expect(game.currentPiece?.type).toBe(heldPiece?.type);
        // holdPiece should now be the second piece
        expect(game.holdPiece?.type).toBe(secondPiece?.type);
    });

    it('should only allow holding once per turn', () => {
        const firstPiece = game.currentPiece;
        game.handleAction(GameAction.HOLD);

        // Held, swapped.
        expect(game.holdPiece?.type).toBe(firstPiece?.type);

        const newPiece = game.currentPiece;

        // Try holding again immediately
        game.handleAction(GameAction.HOLD);

        // Should NOT differ
        expect(game.currentPiece).toBe(newPiece); // Still the same
        expect(game.holdPiece?.type).toBe(firstPiece?.type); // Still the first piece
    });
});
