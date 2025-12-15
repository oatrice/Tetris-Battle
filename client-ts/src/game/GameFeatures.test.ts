
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';

describe('Game Features', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
    });

    describe('Pause', () => {
        it('should start unpaused', () => {
            expect(game.isPaused).toBe(false);
        });

        it('should toggle pause state', () => {
            game.togglePause();
            expect(game.isPaused).toBe(true);
            game.togglePause();
            expect(game.isPaused).toBe(false);
        });

        it('should not update game state when paused', () => {
            game.start();
            game.togglePause(); // Pause the game
            const startY = game.position.y;

            // Update with enough time to trigger a drop if it wasn't paused
            game.update(2000);

            expect(game.position.y).toBe(startY); // Should not move
        });
    });

    describe('Restart', () => {
        it('should clear the board on restart', () => {
            game.start();
            // Manually fill a spot on the board
            game.board.grid[19][5] = 1;

            // Restart
            game.restart();

            // Check if that spot is cleared
            expect(game.board.grid[19][5]).toBe(0);
        });

        it('should reset score and lines on restart', () => {
            game.score = 500;
            game.lines = 5;
            game.restart();
            expect(game.score).toBe(0);
            expect(game.lines).toBe(0);
        });

        it('should unpause on restart if paused', () => {
            game.togglePause();
            expect(game.isPaused).toBe(true);
            game.restart();
            expect(game.isPaused).toBe(false);
        });
    });
});
