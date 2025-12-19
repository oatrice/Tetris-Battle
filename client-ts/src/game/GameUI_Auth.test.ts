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
            signInWithGoogle: vi.fn().mockResolvedValue({}),
            logout: vi.fn().mockResolvedValue(undefined),
            getUser: vi.fn().mockReturnValue(null),
            getAuth: vi.fn().mockReturnValue(mockAuth)
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        mockGame = new Game();
        mockGame.setPlayerName = vi.fn();
        mockGame.setPlayerMetadata = vi.fn();
        mockGame.leaderboard = {
            mergeLocalScoresToUser: vi.fn(),
            getTopScores: vi.fn().mockReturnValue([])
        };
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

    it('should update game player metadata on login', () => {
        const mockUser = { uid: 'u1', displayName: 'Tetris Pro', photoURL: 'http://pic.jpg' };
        const ui = new GameUI(mockGame, document.body);
        ui.init();
        ui.updateAuthUI(mockUser);

        expect(mockGame.setPlayerName).toHaveBeenCalledWith('Tetris Pro');
        expect(mockGame.setPlayerMetadata).toHaveBeenCalledWith('u1', 'http://pic.jpg');
    });

    it('should clear game player metadata on logout', () => {
        const ui = new GameUI(mockGame, document.body);
        ui.init();
        ui.updateAuthUI(null);

        expect(mockGame.setPlayerName).toHaveBeenCalledWith('Player'); // Default or stored name? logic might differ
        expect(mockGame.setPlayerMetadata).toHaveBeenCalledWith(undefined, undefined);
    });
    it('should initially hide login button while waiting for auth state (loading)', () => {
        // Override mock to simulate delay
        const delayedAuth = {
            onAuthStateChanged: vi.fn(), // No immediate callback
        };
        (mockAuthService.getAuth as any).mockReturnValue(delayedAuth);

        const ui = new GameUI(mockGame, document.body);
        ui.init();

        const loginBtn = document.getElementById('login-btn');
        // valid check: initially hidden
        expect(loginBtn?.style.display).toBe('none');
    });

    it('should show login button if auth resolves to null (no user)', () => {
        // Override mock to callback with null
        const authWithNull = {
            onAuthStateChanged: vi.fn((cb) => cb(null)),
        };
        (mockAuthService.getAuth as any).mockReturnValue(authWithNull);

        const ui = new GameUI(mockGame, document.body);
        ui.init();

        const loginBtn = document.getElementById('login-btn');
        expect(loginBtn?.style.display).not.toBe('none');
    });

    it('should confirm before logging out', () => {
        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm');
        const ui = new GameUI(mockGame, document.body);
        ui.init();

        // Simulate logged in state so we have a logout button
        const mockUser = { displayName: 'User', photoURL: 'pic.jpg' };
        ui.updateAuthUI(mockUser);

        // Find logout button (it is a button inside #user-profile that says "Logout")
        const profile = document.getElementById('user-profile');
        const buttons = profile?.querySelectorAll('button');
        const logoutBtn = Array.from(buttons || []).find(b => b.textContent === 'Logout');

        expect(logoutBtn).toBeTruthy();

        // Case 1: Cancel logout
        confirmSpy.mockReturnValue(false);
        logoutBtn?.click();
        expect(confirmSpy).toHaveBeenCalled();
        expect(mockAuthService.logout).not.toHaveBeenCalled();

        confirmSpy.mockClear();
        (mockAuthService.logout as any).mockClear();

        // Case 2: Confirm logout
        confirmSpy.mockReturnValue(true);
        logoutBtn?.click();
        expect(confirmSpy).toHaveBeenCalled();
        expect(mockAuthService.logout).toHaveBeenCalled();

        confirmSpy.mockRestore();
    });
});
