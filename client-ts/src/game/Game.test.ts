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

    it('should lock piece and spawn new one when hitting bottom', () => {
        game.start();
        const firstPiece = game.currentPiece;

        // Simulate drop to bottom
        // We can manually set position to bottom-1
        if (!firstPiece) throw new Error('Piece not spawned');

        // Position at bottom (height - shape height)
        // For O (2x2), y = 18. Move to 19 is valid? No, 19 + 2 = 21 (OOB).
        // Board height 20. Indices 0..19.
        // If piece at 18: rows 18, 19.
        // Valid.
        // Move to 19: rows 19, 20. 20 is OOB.
        // So 18 is max Y for O-piece. Move to 19 fails.

        game.position.y = 18;

        // Trigger update/gravity
        game.update(1001);

        // Should have locked first object and spawned new one
        expect(game.currentPiece).not.toBe(firstPiece);
        // Grid at old position should be filled
        expect(game.board.grid[19][5]).not.toBe(0); // Assuming center x=4/5 and O layout
    });

    it('should detect game over', () => {
        game = new Game();
        // Block top area completely to ensure any piece collides
        game.board.grid[0].fill(1);
        game.board.grid[1].fill(1);
        game.board.grid[2].fill(1);
        game.start();

        expect(game.gameOver).toBe(true);
    });
});
