
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { GameMode } from './GameMode';

describe('Game AutoSave on Pause', () => {
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

    it('should save game state when pausing via UI toggle', () => {
        // 1. Start setup
        ui.startGame(GameMode.OFFLINE);
        game.score = 888;
        const saveSpy = vi.spyOn(game, 'saveState');

        // 2. Trigger Pause via UI (which calls game.togglePause inside)
        ui.toggleMenu();

        // 3. Verify it is paused
        expect(game.isPaused).toBe(true);

        // 4. Verify saveState was called
        expect(saveSpy).toHaveBeenCalled();

        // 5. Verify actual storage
        const key = 'tetris_state';
        const saved = localStorage.getItem(key);
        expect(saved).not.toBeNull();
        expect(JSON.parse(saved!).score).toBe(888);
        expect(JSON.parse(saved!).isPaused).toBe(true);
    });

    it('should save game state when pausing via UI toggle in SPECIAL mode', () => {
        // 1. Start setup
        ui.startGame(GameMode.SPECIAL);
        game.score = 777;
        const saveSpy = vi.spyOn(game, 'saveState');

        // 2. Trigger Pause via UI (which calls game.togglePause inside)
        ui.toggleMenu();

        // 3. Verify it is paused
        expect(game.isPaused).toBe(true);

        // 4. Verify saveState was called
        expect(saveSpy).toHaveBeenCalled();

        // 5. Verify actual storage for SPECIAL mode
        const key = 'tetris_state_special';
        const saved = localStorage.getItem(key);
        expect(saved).not.toBeNull();
        expect(JSON.parse(saved!).score).toBe(777);
        expect(JSON.parse(saved!).isPaused).toBe(true);
    });
});
