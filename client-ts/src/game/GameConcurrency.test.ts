
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';
import { GameAction } from './InputHandler';

describe('Game Concurrency & Race Conditions', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game(GameMode.SPECIAL);
        game.start();
    });

    it('should block input actions while board is cascading to prevent overlaps', () => {
        // ARRANGE
        // Force state: cascading
        game.isCascading = true;

        // Spawn a piece manually to have something to move
        (game as any).spawnPiece();
        const initialX = game.position.x;
        const initialY = game.position.y;

        // ACT
        // Try to move right
        game.handleAction(GameAction.MOVE_RIGHT);

        // ASSERT
        // Should NOT have moved if we are properly blocking inputs during unstable state
        expect(game.position.x).toBe(initialX);

        // Try to Hard Drop
        game.handleAction(GameAction.HARD_DROP);
        // Should still be at top (or original y)
        expect(game.position.y).toBe(initialY);
    });

    it('should allow hold only when stable', () => {
        game.isCascading = true;
        (game as any).spawnPiece();
        const currentType = game.currentPiece?.type;

        // ACT
        game.handleAction(GameAction.HOLD);

        // ASSERT
        // Should NOT have swapped
        expect(game.currentPiece?.type).toBe(currentType);
        expect(game.holdPiece).toBeNull();
    });
});
