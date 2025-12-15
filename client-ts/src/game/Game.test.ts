import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { Tetromino } from './Tetromino';
import { GameAction } from './InputHandler';

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
        game.handleAction(GameAction.MOVE_LEFT);
        expect(game.position.x).toBe(startX - 1);

        game.handleAction(GameAction.MOVE_RIGHT); // Back to start
        game.handleAction(GameAction.MOVE_RIGHT); // One right
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
            game.handleAction(GameAction.ROTATE_CW);
            const shapeAfter = JSON.stringify(game.currentPiece.shape);
            expect(shapeBefore).not.toBe(shapeAfter);
        }
    });

    it('should lock piece and spawn new one when hitting bottom', () => {
        game.start();

        // Force specific piece to insure deterministic behavior (O piece is safe)
        const oPiece = new Tetromino('O'); // [[1,1],[1,1]]
        // Mock shape if Tetromino is complex, but 'O' is standard.
        // We assume Tetromino class works.

        game.currentPiece = oPiece;
        // Adjust position logic if necessary, but update() uses currentPiece
        // Ensure x is consistent
        game.position.x = 4;

        const firstPiece = game.currentPiece;

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

    it('should detect game over when spawning on full board', () => {
        game.start();
        // Fill top rows to cause collision with new piece
        game.board.grid[0].fill(1);
        game.board.grid[1].fill(1);
        game.board.grid[2].fill(1);

        // Force spawn to trigger collision check
        // Accessing private method for testing purposes
        (game as any).spawnPiece();

        expect(game.gameOver).toBe(true);
    });

    it('should generate next piece and shift it to current piece on spawn', () => {
        game.start();

        const initialNextPiece = game.nextPiece;
        expect(initialNextPiece).toBeDefined();

        // Force simple spawn (simulate lock behavior)
        // We can directly call private method if we cast to any, or trigger update
        // Let's modify state to trigger lock
        game.position.y = 18; // Bottom-ish
        // Determine where it locks efficiently or just call a simpler public method if available?
        // We don't have public spawn, but start() calls it.
        // Ideally we want to see the sequence.

        // Let's inspect the queue mechanic.
        // If we call update with enough time to lock:
        // game.update(1001) -> moveDown -> lock -> spawnPiece

        // Need to ensure valid position for lock so we don't game over
        // Let's assume empty board
        const originalIsValid = game.board.isValidPosition;

        // Move piece to bottom to ensure it locks on next update
        // Simple hack: mock isValidPosition to return false on move down
        game.board.isValidPosition = (_p, _x, y) => {
            // If checking (x, y+1) (move down), fail to trigger lock
            if (y > game.position.y) return false;
            return true;
        };

        game.update(1001); // Trigger lock & spawn

        // Restore
        game.board.isValidPosition = originalIsValid;

        expect(game.currentPiece?.type).toBe(initialNextPiece?.type);
        expect(game.nextPiece).not.toBe(initialNextPiece);
        expect(game.nextPiece).toBeDefined();
    });

    it('should increase score when lines are cleared', () => {
        game.start();
        expect(game.score).toBe(0);

        // Mock board.clearLines to return 1
        // @ts-ignore
        game.board.clearLines = () => ({ count: 1, indices: [19] });

        // Trigger an update that causes a lock
        // We can simulate logic manually or call internal method if we could
        // But better to use public API or mock dependencies.

        // Since Game.moveDown() calls lockPiece() then clearLines()
        // We'll trust the flow.

        // Force lock condition
        game.position.y = 18;
        game.board.isValidPosition = (_p, _x, y) => {
            if (y > game.position.y) return false;
            return true;
        };

        game.update(1001); // Trigger moveDown -> lock -> clearLines -> update score

        // Basic scoring: 100 per line (simplified)
        expect(game.score).toBe(100);
        expect(game.lines).toBe(1);
    });
});
