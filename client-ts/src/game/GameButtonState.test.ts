import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService');

describe('GameUI Button State', () => {
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
        ui.init();
    });

    it('should show "Pause" text on button when starting a new game after quitting', () => {
        // 1. Start Game
        ui.startGame();
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;
        expect(pauseBtn.textContent).toBe('Pause');

        // 2. Pause Game
        ui.toggleMenu(); // Pauses game
        expect(pauseBtn.textContent).toBe('Resume');

        // 3. Quit to Home
        const homeBtn = root.querySelector('#menuHomeBtn') as HTMLButtonElement;

        homeBtn.click(); // Hide menu, show home

        // 4. Start Game again (Solo)
        ui.startGame();

        // Bug Fix Applied: เมื่อเริ่มเกมใหม่จะ unpause โดยอัตโนมัติ
        // ดังนั้นปุ่มควรแสดง "Pause" แทนที่จะเป็น "Resume"
        expect(pauseBtn.textContent).toBe('Pause');
    });
});
