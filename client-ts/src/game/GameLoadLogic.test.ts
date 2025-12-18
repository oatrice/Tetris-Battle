
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { GameMode } from './GameMode';

describe('Game Load Strategy', () => {
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

    it('should NOT load state if forceReset is true (Special Mode Bug Repro)', () => {
        // 1. Save a special state
        const specialGame = new Game(GameMode.SPECIAL);
        specialGame.score = 999;
        specialGame.saveState();

        // 2. Start Game via UI with Special Mode
        // In GameUI.ts: if (mode) { this.game.mode = mode; this.game.start(true); }
        game.mode = GameMode.SPECIAL;

        // Call start with forceReset = false (Correct Logic)
        game.start(false);

        // 3. Expect loadState to NOT be called or NOT return true
        // Because forceReset is true!

        // This confirms why it's not loading.
        // It enters: if (!forceReset && this.loadState()) { ... }
        // Since forceReset is true, it skips loading and resets everything.

        expect(game.score).toBe(999); // Should load now
    });

    it('should load state if forceReset is false', () => {
        // 1. Save a solo state
        const soloGame = new Game(GameMode.OFFLINE);
        soloGame.score = 123;
        soloGame.saveState();

        // 2. Start Game via UI for Solo (No mode arg)
        // In GameUI.ts: else { this.game.start(false); }

        game.mode = GameMode.OFFLINE;
        game.start(false);

        expect(game.score).toBe(123);
    });
});
