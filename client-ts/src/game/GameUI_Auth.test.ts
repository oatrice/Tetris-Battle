import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';
import { Game } from './Game';

// Mock dependencies
vi.mock('../services/AuthService');
vi.mock('./Game');

describe('GameUI Auth Integration', () => {
    let mockAuthService: any;
    let mockGame: any;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';

        // Setup mock AuthService
        const mockAuth = {
            onAuthStateChanged: vi.fn((callback) => callback(null)), // Immediate callback
        };

        mockAuthService = {
            signInWithGoogle: vi.fn(),
            logout: vi.fn(),
            getUser: vi.fn().mockReturnValue(null),
            getAuth: vi.fn().mockReturnValue(mockAuth)
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        mockGame = new Game();
    });

    it('should create a login button on initialization', () => {
        const ui = new GameUI(mockGame, document.body);
        ui.init();
        const loginBtn = document.getElementById('login-btn');
        expect(loginBtn).toBeTruthy();
        expect(loginBtn?.textContent).toBe('Login with Google');
    });

    it('should show user profile when logged in', () => {
        // Mock logged in user
        const mockUser = { displayName: 'Tetris Pro', photoURL: 'http://example.com/pic.jpg' };
        mockAuthService.getUser.mockReturnValue(mockUser);

        const ui = new GameUI(mockGame, document.body);
        ui.init(); // Init creates elements
        ui.updateAuthUI(mockUser);

        const profileContainer = document.getElementById('user-profile');
        const profileName = document.getElementById('user-name');
        const loginBtn = document.getElementById('login-btn');

        expect(profileName?.textContent).toBe('Tetris Pro');
        expect(profileContainer?.style.display).not.toBe('none');
        expect(loginBtn?.style.display).toBe('none');
    });

    it('should call signInWithGoogle when login button is clicked', async () => {
        mockAuthService.signInWithGoogle.mockResolvedValue({ displayName: 'Test' });
        const ui = new GameUI(mockGame, document.body);
        ui.init();
        const loginBtn = document.getElementById('login-btn');

        loginBtn?.click();

        expect(mockAuthService.signInWithGoogle).toHaveBeenCalled();
    });
});
