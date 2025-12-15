
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameAction } from './InputHandler';

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

    describe('Keyboard Shortcuts', () => {
        it('should pause game when PAUSE action is received', () => {
            game.handleAction(GameAction.PAUSE);
            expect(game.isPaused).toBe(true);
            game.handleAction(GameAction.PAUSE);
            expect(game.isPaused).toBe(false);
        });

        it('should restart game when RESTART action is received', () => {
            game.start();
            game.score = 100;
            game.handleAction(GameAction.RESTART);
            expect(game.score).toBe(0);
        });

        it('should allow restart even if game over', () => {
            game.gameOver = true;
            game.handleAction(GameAction.RESTART);
            expect(game.gameOver).toBe(false);
        });
    });
    describe('Hard Drop', () => {
        it('should drop piece to bottom immediately', () => {
            game.start();


            game.handleAction(GameAction.HARD_DROP);

            // Score should increase by 2 * drop distance (> 0)
            expect(game.score).toBeGreaterThan(0);
        });

        it('should lock the piece and spawn a new one', () => {
            game.start();
            const initialPiece = game.currentPiece;

            game.handleAction(GameAction.HARD_DROP);

            // Current piece should be different (new piece spawned)
            expect(game.currentPiece).not.toBe(initialPiece);
        });
    });

    describe('Ghost Piece', () => {
        it('should calculate ghost position correctly', () => {
            game.start();
            const ghostPos = game.getGhostPosition();

            expect(ghostPos).toBeDefined();
            expect(ghostPos.x).toBe(game.position.x);
            expect(ghostPos.y).toBeGreaterThanOrEqual(game.position.y);

            // Validate it is effectively the hard drop position
            // Verify that moving one more down would be invalid
            expect(game.board.isValidPosition(game.currentPiece!, ghostPos.x, ghostPos.y)).toBe(true);
            expect(game.board.isValidPosition(game.currentPiece!, ghostPos.x, ghostPos.y + 1)).toBe(false);
        });
    });
});

