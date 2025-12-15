import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameMode } from './GameMode';

describe('Offline Mode', () => {
    let game: Game;

    beforeEach(() => {
        game = new Game();
    });

    it('should initialize in OFFLINE mode by default', () => {
        expect(game.mode).toBe(GameMode.OFFLINE);
    });

    it('should identify as offline', () => {
        expect(game.isOffline).toBe(true);
    });
});
