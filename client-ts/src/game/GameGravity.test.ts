import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';

describe('Game Gravity Reset', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
    });

    it('should reset drop interval (gravity) when game is restarted', () => {
        game.start();

        // Simulate reaching a higher level
        game.lines = 100;
        // Trigger logic that updates level and speed. 
        // This usually happens in moveDown() -> clearLines().
        // We can manually set the state to simulate "dirty" state from previous game.

        // Let's set the private properties directly to simulate a high-level state
        (game as any).level = 10;
        (game as any).dropInterval = 100; // Fast speed

        expect((game as any).level).toBe(10);
        expect((game as any).dropInterval).toBe(100);

        // Restart game
        game.restart();

        // Check if values are reset
        expect((game as any).level).toBe(1);
        expect((game as any).dropInterval).toBe(1000); // Should be back to default 1s
    });

    it('should reset drop interval when start() is called after game over', () => {
        game.start();

        // Simulate game over state at high level
        (game as any).level = 5;
        (game as any).dropInterval = 500;
        game.gameOver = true;

        // Restart
        game.start();

        expect((game as any).level).toBe(1);
        expect((game as any).dropInterval).toBe(1000);
    });
});
