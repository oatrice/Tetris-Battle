
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';
import { Tetromino } from './Tetromino';

describe('Special Mode - Cascade Gravity', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game(GameMode.SPECIAL);
    });

    it('should move blocks down one step at a time with processGravityStep', () => {
        // Setup: Block at (0, 17), Empty at (0, 18), (0, 19)
        game.board.grid[17][0] = 1;
        game.board.grid[18][0] = 0;
        game.board.grid[19][0] = 0;

        // Step 1
        const moved1 = game.board.processGravityStep();
        expect(moved1).toBe(true);
        expect(game.board.grid[17][0]).toBe(0);
        expect(game.board.grid[18][0]).toBe(1);
        expect(game.board.grid[19][0]).toBe(0);

        // Step 2
        const moved2 = game.board.processGravityStep();
        expect(moved2).toBe(true);
        expect(game.board.grid[18][0]).toBe(0);
        expect(game.board.grid[19][0]).toBe(1);

        // Step 3 (Stable)
        const moved3 = game.board.processGravityStep();
        expect(moved3).toBe(false);
        expect(game.board.grid[19][0]).toBe(1);
    });

    it('should enter cascading state and animate gravity when lines are cleared', () => {
        game.board.grid[19].fill(1); // Full row

        // Setup partial row above: (0, 18)=1, (1, 17)=1
        game.board.grid[18][0] = 1;
        game.board.grid[17][1] = 1;

        // Force lock logic with a dummy piece
        game.currentPiece = new Tetromino('O');
        game.position = { x: 4, y: 0 };

        // Mock isValidPosition to fail movement check, triggering lock
        const originalIsValid = game.board.isValidPosition;
        game.board.isValidPosition = (_p, _x, y) => {
            if (y > game.position.y) return false;
            return true;
        };

        // Mock lockPiece to avoid adding the O-piece to the top of the board (which would cause long cascading)
        game.board.lockPiece = () => { };

        // Mock clearLines to ensure it returns count > 0 and modifies grid ONLY ONCE
        let clearLinesCalled = false;
        game.board.clearLines = () => {
            if (!clearLinesCalled) {
                clearLinesCalled = true;
                // Remove row 19
                game.board.grid.splice(19, 1);
                // Add empty row at top
                game.board.grid.unshift(Array(10).fill(0));
                return { count: 1, indices: [19] };
            }
            return { count: 0, indices: [] };
        };

        // Trigger moveDown (which locks and clears lines)
        (game as any).moveDown();
        game.board.isValidPosition = originalIsValid;

        // After clear:
        // Line 19 gone.
        // Old 18 -> New 19. grid[19][0] = 1.
        // Old 17 -> New 18. grid[18][1] = 1.
        // Column 1: grid[18][1]=1, grid[19][1]=0.
        // We expect cascading to fill (1, 19).

        expect(game.isCascading).toBe(true);
        expect(game.currentPiece).toBeNull(); // Shouldn't have spawned yet

        // Verify state immediately after line clear (before gravity step)
        // Old 17 -> New 18. grid[18][1] should be 1.
        expect(game.board.grid[18][1]).toBe(1);
        // Old 18 -> New 19. grid[19][1] should be 0.
        expect(game.board.grid[19][1]).toBe(0);

        // Simulate Game Updates for Animation
        // Step 1: Wait for delay
        game.update(550); // > 500ms delay

        // Should have moved once
        expect(game.board.grid[19][1]).toBe(1);
        expect(game.board.grid[18][1]).toBe(0);

        // Step 2: Next update (Stable)
        game.update(550);

        // Should be done
        expect(game.isCascading).toBe(false);
        expect(game.currentPiece).not.toBeNull(); // Spawned new piece
    });

    it('should NOT cascade in OFFLINE mode (Standard)', () => {
        game = new Game(GameMode.OFFLINE);

        // Same setup
        game.board.grid[19].fill(1);
        game.board.grid[18][1] = 1;
        game.board.grid[17][0] = 1;

        game.currentPiece = new Tetromino('O');
        game.position = { x: 4, y: 0 };
        const originalIsValid = game.board.isValidPosition;
        game.board.isValidPosition = (_p, _x, y) => {
            if (y > game.position.y) return false;
            return true;
        };

        (game as any).moveDown();
        game.board.isValidPosition = originalIsValid;

        // Standard Behavior: NO sticky gravity filling holes
        // Old 18 -> New 19. grid[19][1] = 1 (shifted down)
        // Old 17 -> New 18. grid[18][0] = 1.

        // But the holes created by "Shift" are what they are.
        // Wait, standard shift logic:
        // indices=[19].
        // grid[19] removed.
        // grid[0..18] become grid[1..19].
        // So (0, 17) becomes (0, 18).
        // (1, 18) becomes (1, 19).

        // So in standard:
        // (1, 19) IS 1 (because it was at 18).
        // (0, 18) IS 1 (because it was at 17).
        // (0, 19) IS 0 (because it was at 18, which was 0).

        // In Cascade (Test above):
        // (0, 19) is 1. (Stable).
        // (1, 19) was 0 because (1, 18) was 0?
        // Wait, check setup of prev test:
        // game.board.grid[18][0] = 1; 
        // game.board.grid[17][1] = 1;
        // After shift:
        // (0, 18) from old (0, 17) -> was 0. So (0, 18) is 0.
        // (0, 19) from old (0, 18) -> was 1. So (0, 19) is 1.
        // (1, 18) from old (1, 17) -> was 1. So (1, 18) is 1.
        // (1, 19) from old (1, 18) -> was 0. So (1, 19) is 0.

        // Standard Result:
        // (1, 18) was 1 (from 0,17 wait... setup is [18][1]=1, [17][0]=1)
        // Shift:
        // old[18][1] -> new[19][1]. So [19][1] should be 1.
        // old[17][0] -> new[18][0]. So [18][0] should be 1.

        expect(game.board.grid[19][1]).toBe(1);
        expect(game.board.grid[18][0]).toBe(1);

        expect(game.isCascading).toBe(false); // Flag not set
    });
});
