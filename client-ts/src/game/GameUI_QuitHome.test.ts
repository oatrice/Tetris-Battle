
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { GameMode } from './GameMode';

describe('GameUI Quit to Home', () => {
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

    it('should save game state when quitting to home', () => {
        // 1. Start game
        ui.startGame(GameMode.OFFLINE);
        game.score = 500;

        // 2. Mock saveState to track calls
        const saveSpy = vi.spyOn(game, 'saveState');

        // 3. Simulate Quit to Home (usually from Pause Menu)
        // Access private method or trigger button if possible. 
        // Since showHome is public-ish (not private in TS, but inferred? Let's check file)
        // In GameUI.ts it is: showHome() { ... } (public by default)

        ui.showHome();

        // 4. Verification
        expect(saveSpy).toHaveBeenCalled();

        // Verify storage actually has it (integration check)
        // We need to ensure the save actually happened via the spy is good enough, 
        // but checking localStorage is better proof.
        // However, saveState implementation writes to localStorage.

        const key = 'tetris_state';
        const saved = localStorage.getItem(key);
        expect(saved).not.toBeNull();
        expect(JSON.parse(saved!).score).toBe(500);
    });
});
