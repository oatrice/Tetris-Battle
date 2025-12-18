import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService');

describe('GameUI Auto Save/Restore', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');

        // Setup mock AuthService
        const mockAuth = {
            onAuthStateChanged: vi.fn(),
        };
        const mockAuthService = {
            getAuth: vi.fn().mockReturnValue(mockAuth),
            getUser: vi.fn().mockReturnValue(null)
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        ui = new GameUI(game, root);

        // Mock game methods
        game.saveState = vi.fn();
        game.loadState = vi.fn();

        // Mock global window addEventListener
        vi.spyOn(window, 'addEventListener');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should save state on window blur', () => {
        ui.init(); // This should attach listeners

        // Simulate blur event
        const blurEvent = new Event('blur');
        window.dispatchEvent(blurEvent);

        expect(game.saveState).toHaveBeenCalled();
    });

    it('should load state on window focus', () => {
        ui.init(); // This should attach listeners

        // Simulate focus event
        const focusEvent = new Event('focus');
        window.dispatchEvent(focusEvent);

        expect(game.loadState).toHaveBeenCalled();
    });
});
