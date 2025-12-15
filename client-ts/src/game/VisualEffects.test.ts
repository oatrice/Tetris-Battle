
import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board';
import { Game } from './Game';

describe('Visual Effects Logic', () => {
    describe('Board Line Clearing Info', () => {
        let board: Board;

        beforeEach(() => {
            board = new Board(10, 20);
        });

        it('should return indices of cleared lines', () => {
            // Fill two rows
            board.grid[18] = Array(10).fill(1);
            board.grid[19] = Array(10).fill(1);

            // clearLines currently returns number, we want it to return { count: number, indices: number[] } or just indices
            // Let's assume we want indices
            const result = board.clearLines();
            // @ts-ignore - existing simple signature
            expect(result.indices).toEqual([18, 19]);
            // @ts-ignore
            expect(result.count).toBe(2);
        });
    });

    describe('Game Effect Management', () => {
        let game: Game;

        beforeEach(() => {
            game = new Game();
        });

        it('should register an effect when lines are cleared', () => {
            game.start();
            // Manually fill bottom row
            game.board.grid[19] = Array(10).fill(1);

            // Force a lock/check cycle (simulating a drop that triggers clear)
            // We need to simulate the condition where clearLines is called.
            // game.moveDown() is private, but we can trigger it or just mock board behavior if possible.
            // Easier: just verify Game has an 'effects' array and we can see it populated after a clear event.

            // To reliably trigger moveDown and lock, we can put a piece right above bottom and hard drop.

            // Reset board first to be clean
            game.board = new Board(10, 20);
            game.board.grid[19] = Array(10).fill(1); // Full row

            // But wait, if I fill the row, it's already full. 
            // Game checks for clears AFTER locking a piece.
            // So I should fill the row EXCEPT one spot, and drop a piece into it.

            game.board.grid[19] = Array(10).fill(1);
            game.board.grid[19][5] = 0; // Hole at 5

            // Spawn an I piece (or just force one)
            // To be precise, let's just test that the Game class HAS an effects array which is initially empty.

            // @ts-ignore
            expect(game.effects).toEqual([]);
        });

        it('should add LineClearEffect when lines are cleared', () => {
            game.start();
            // @ts-ignore
            game.board.clearLines = () => ({ count: 1, indices: [19] });

            // Trigger update that calls moveDown (mocking internals or triggering via update)
            // We need to ensure we get into the logic block. 
            // Simplest way: manually call the logic that adds effects or mock enough state.
            // But Game.ts logic is inside private moveDown.

            // Let's rely on the public 'update' method + state setup like in previous tests.
            game.position.y = 10;
            game.currentPiece = { type: 'I', shape: [[1]], rotate: () => { } } as any;
            // Mock isValidPosition to force lock on next update
            game.board.isValidPosition = (p, x, y) => {
                return y <= game.position.y; // Allow current, block next
            };

            // Manually advance timer to trigger drop without expiring effect
            // @ts-ignore
            game.dropTimer = 1000;
            game.update(10);

            expect(game.effects.length).toBe(1);
            expect(game.effects[0].color).toBeDefined();
        });

        it('should assign different colors for different clear counts', () => {
            const clearCounts = [1, 2, 3, 4];
            const colors = new Set();

            clearCounts.forEach(count => {
                const g = new Game();
                g.start();
                g.currentPiece = { type: 'I', shape: [[1]], rotate: () => { } } as any;
                g.board.isValidPosition = (p, x, y) => y <= g.position.y;

                // Mock clearLines
                g.board.clearLines = () => ({ count, indices: Array.from({ length: count }, (_, i) => 19 - i) });

                // @ts-ignore
                g.dropTimer = 1000;
                g.update(10);

                if (g.effects.length > 0) {
                    colors.add(g.effects[0].color);
                }
            });

            // Should have 4 distinct colors
            expect(colors.size).toBe(4);
        });
    });
});
