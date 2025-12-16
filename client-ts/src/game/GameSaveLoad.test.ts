import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';

describe('Game Save/Load', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('should save state to localStorage', () => {
        const game = new Game(GameMode.OFFLINE);
        game.start();

        // Simulate some state
        game.score = 100;
        game.lines = 5;
        game.position = { x: 5, y: 10 };

        // We expect a saveState method to exist
        // @ts-ignore
        game.saveState();

        const savedJson = localStorage.getItem('tetris_state');
        expect(savedJson).toBeTruthy();

        const state = JSON.parse(savedJson!);
        expect(state.score).toBe(100);
        expect(state.lines).toBe(5);
        expect(state.position).toEqual({ x: 5, y: 10 });
        expect(state.board).toBeDefined();
        expect(state.currentPiece).toBeDefined();
    });

    it('should restore state from localStorage', () => {
        const savedState = {
            score: 500,
            lines: 20,
            level: 3,
            board: Array(20).fill(Array(10).fill(0)), // Simple empty board representation
            currentPiece: {
                type: 'T',
                shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]]
            },
            nextPiece: {
                type: 'I',
                shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]]
            },
            position: { x: 3, y: 4 },
            playerName: 'TestPlayer',
            ghostPieceEnabled: false
        };

        localStorage.setItem('tetris_state', JSON.stringify(savedState));

        const game = new Game(GameMode.OFFLINE);

        // We expect a loadState method to exist
        // @ts-ignore
        const loaded = game.loadState();

        expect(loaded).toBe(true);
        expect(game.score).toBe(500);
        expect(game.lines).toBe(20);
        expect(game.level).toBe(3);
        expect(game.position).toEqual({ x: 3, y: 4 });
        expect(game.playerName).toBe('TestPlayer');
        expect(game.ghostPieceEnabled).toBe(false);
        expect(game.currentPiece?.type).toBe('T');
        expect(game.nextPiece?.type).toBe('I');
        // Board restoration verification would require more mock setup for grid equality
    });
});
