
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';

describe('Game Save/Load Modes', () => {

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should use separate save files for OFFLINE (Solo) and SPECIAL modes', () => {
        // 1. Play offline mode and save
        const soloGame = new Game(GameMode.OFFLINE);
        soloGame.start();
        soloGame.score = 100;
        soloGame.lines = 5;
        soloGame.saveState();

        // 2. Play special mode and save
        const specialGame = new Game(GameMode.SPECIAL);
        specialGame.start();
        specialGame.score = 500;
        specialGame.lines = 10;
        specialGame.saveState();

        // 3. Load offline mode and verify it loads the solo state
        const loadedSoloGame = new Game(GameMode.OFFLINE);
        const loadedSolo = loadedSoloGame.loadState();
        expect(loadedSolo).toBe(true);
        expect(loadedSoloGame.score).toBe(100);
        expect(loadedSoloGame.lines).toBe(5);

        // 4. Load special mode and verify it loads the special state
        const loadedSpecialGame = new Game(GameMode.SPECIAL);
        const loadedSpecial = loadedSpecialGame.loadState();
        expect(loadedSpecial).toBe(true);
        expect(loadedSpecialGame.score).toBe(500);
        expect(loadedSpecialGame.lines).toBe(10);
    });

    it('should not load special save into solo game', () => {
        // Save only special game
        const specialGame = new Game(GameMode.SPECIAL);
        specialGame.start();
        specialGame.score = 999;
        specialGame.saveState();

        // Try load solo
        const soloGame = new Game(GameMode.OFFLINE);
        const loaded = soloGame.loadState();

        // Should find nothing for solo
        expect(loaded).toBe(false);
        expect(soloGame.score).toBe(0);
    });

    it('should not load solo save into special game', () => {
        // Save only solo game
        const soloGame = new Game(GameMode.OFFLINE);
        soloGame.start();
        soloGame.score = 111;
        soloGame.saveState();

        // Try load special
        const specialGame = new Game(GameMode.SPECIAL);
        const loaded = specialGame.loadState();

        // Should find nothing for special
        expect(loaded).toBe(false);
        expect(specialGame.score).toBe(0);
    });
});
