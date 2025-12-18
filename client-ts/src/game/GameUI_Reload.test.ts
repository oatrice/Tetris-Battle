
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { GameMode } from './GameMode';

describe('GameUI Reload/Refresh Behavior', () => {
    let game: Game;
    let ui: GameUI;
    let root: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        root = document.getElementById('app')!;
        game = new Game(GameMode.OFFLINE);
        ui = new GameUI(game, root);
        ui.init();
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should save game state on beforeunload (Cmd+R)', () => {
        // 1. Start game and progress
        ui.startGame(GameMode.OFFLINE);
        game.score = 750;

        // 2. Mock saveState
        const saveSpy = vi.spyOn(game, 'saveState');

        // 3. User Pauses manually (e.g. presses P or button)
        game.togglePause();
        expect(game.isPaused).toBe(true);

        // 4. Simulate Cmd+R (beforeunload event)
        window.dispatchEvent(new Event('beforeunload'));

        // 5. Verify save was called
        expect(saveSpy).toHaveBeenCalled();

        // 6. Verify storage
        const key = 'tetris_state';
        const saved = localStorage.getItem(key);
        expect(saved).not.toBeNull();
        const state = JSON.parse(saved!);
        expect(state.score).toBe(750);
        expect(state.isPaused).toBe(true);
    });

    it('should save game state on beforeunload even if NOT paused', () => {
        // 1. Start game
        ui.startGame(GameMode.OFFLINE);
        game.score = 300;
        game.isPaused = false;

        // 2. Simulate Cmd+R directly while playing
        window.dispatchEvent(new Event('beforeunload'));

        // 3. Verify it forces pause and saves
        const key = 'tetris_state';
        const saved = localStorage.getItem(key);
        expect(saved).not.toBeNull();
        const state = JSON.parse(saved!);
        expect(state.score).toBe(300);
        expect(state.isPaused).toBe(true); // Should ensure it saves as paused
    });
});
