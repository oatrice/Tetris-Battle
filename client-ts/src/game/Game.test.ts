import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { Tetromino } from './Tetromino';

describe('Game', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
    });

    it('should start with no piece', () => {
        expect(game.currentPiece).toBeNull();
    });

    it('should spawn a piece when started', () => {
        game.start();
        expect(game.currentPiece).not.toBeNull();

        // Check centering logic matches implementation: floor((10 - width) / 2)
        if (game.currentPiece) {
            const expectedX = Math.floor((10 - game.currentPiece.shape[0].length) / 2);
            expect(game.position.x).toBe(expectedX);
            expect(game.position.y).toBe(0);
        }
    });

    it('should move piece down on update due to gravity', () => {
        game.start();
        const startY = game.position.y;

        // Simulate enough time for gravity to trigger
        // Assume 1000ms drop rate for level 1
        game.update(1001);

        expect(game.position.y).toBeGreaterThan(startY);
    });

    it('should move piece left/right on input', () => {
        game.start();
        const startX = game.position.x;

        // Move Left (assuming not blocked)
        // We need to expose a method to handle arbitrary actions or call moveLeft directly
        // Let's assume game.handleAction is the interface
        game.handleAction('MOVE_LEFT');
        expect(game.position.x).toBe(startX - 1);

        game.handleAction('MOVE_RIGHT'); // Back to start
        game.handleAction('MOVE_RIGHT'); // One right
        expect(game.position.x).toBe(startX + 1);
    });

    it('should rotate piece on input', () => {
        game.start();
        // Inject a T piece manually for test
        game.currentPiece = new Tetromino('T');

        // Position safely
        game.position = { x: 5, y: 5 };

        if (game.currentPiece) {
            const shapeBefore = JSON.stringify(game.currentPiece.shape);
            game.handleAction('ROTATE_CW');
            const shapeAfter = JSON.stringify(game.currentPiece.shape);
            expect(shapeBefore).not.toBe(shapeAfter);
        }
    });
});
