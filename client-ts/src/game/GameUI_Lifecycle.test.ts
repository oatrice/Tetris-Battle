
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameUI } from './GameUI';
import { Game } from './Game';
import { GameMode } from './GameMode';

describe('GameUI Lifecycle', () => {
    let game: Game;
    let root: HTMLElement;
    let gameUI: GameUI;

    beforeEach(() => {
        game = new Game(GameMode.OFFLINE);
        root = document.createElement('div');
        gameUI = new GameUI(game, root);

        // Mock game.saveState to track calls
        vi.spyOn(game, 'saveState');
    });

    it('should pause and save state when window is unloaded', () => {
        gameUI.init();
        game.start();
        game.score = 999;
        game.isPaused = false;

        // Trigger beforeunload event
        window.dispatchEvent(new Event('beforeunload'));

        expect(game.isPaused).toBe(true);
        expect(game.saveState).toHaveBeenCalled();

        // Verify localStorage
        const saved = localStorage.getItem('tetris_state');
        expect(saved).toBeTruthy();
        const state = JSON.parse(saved!);
        expect(state.score).toBe(999);
        expect(state.isPaused).toBe(true);
    });
});
