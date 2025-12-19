import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService');
vi.mock('virtual:version-info', () => ({
    APP_VERSION: '1.0.0',
    COMMIT_HASH: 'test',
    COMMIT_DATE: 'test'
}));

describe('GameUI Layout', () => {
    let game: Game;
    let ui: GameUI;
    let root: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        root = document.getElementById('app')!;
        game = new Game();

        // Mock AuthService
        const mockAuthService = {
            getAuth: vi.fn(),
            signInWithGoogle: vi.fn(),
            logout: vi.fn()
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        ui = new GameUI(game, root);
    });

    it('should have margin-top for the player name section (modeDisplay)', () => {
        ui.init();
        const modeDisplay = root.querySelector('#modeDisplay') as HTMLElement;
        expect(modeDisplay).not.toBeNull();

        // We expect some margin to be applied (e.g. 1rem), currently it is 0
        expect(modeDisplay.style.marginTop).toBe('1rem');
    });
});
