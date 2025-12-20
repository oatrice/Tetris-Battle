
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService');

// Mock the virtual module
vi.mock('virtual:version-info', () => {
    return {
        APP_VERSION: '1.0.0',
        COMMIT_HASH: 'initial_mock_hash',
        COMMIT_DATE: 'initial_mock_date'
    };
});

describe('GameUI Auth Loading State', () => {
    let game: Game;
    let ui: GameUI;
    let root: HTMLElement;
    let mockAuthCallback: (user: any) => void;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        root = document.getElementById('app')!;
        game = new Game();

        // Setup mock AuthService
        const mockAuth = {
            onAuthStateChanged: vi.fn((callback) => {
                mockAuthCallback = callback;
                // Do NOT call callback immediately to simulate loading
                return () => { };
            }),
        };
        const mockAuthService = {
            getAuth: vi.fn().mockReturnValue(mockAuth),
            signInWithGoogle: vi.fn(),
            logout: vi.fn(),
            getUser: vi.fn().mockReturnValue(null)
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        ui = new GameUI(game, root);
    });

    it('should show login button with loading text initially while waiting for auth state', () => {
        ui.init();

        const loginBtn = root.querySelector('#login-btn') as HTMLButtonElement;
        expect(loginBtn).not.toBeNull();
        expect(loginBtn.style.display).toBe('block'); // Should be visible with loading state
        expect(loginBtn.textContent).toBe('🔄 Loading Auth...');
        expect(loginBtn.disabled).toBe(true); // Disabled while loading
    });

    it('should show login button with proper text if auth returns null (no user)', () => {
        ui.init();

        const loginBtn = root.querySelector('#login-btn') as HTMLButtonElement;

        // Simulate Auth finishing with no user
        if (mockAuthCallback) {
            mockAuthCallback(null);
        }

        expect(loginBtn.style.display).toBe('block');
        expect(loginBtn.textContent).toBe('Login with Google'); // Text should update
        expect(loginBtn.disabled).toBe(false); // Should be enabled now
    });

    it('should keep login button hidden and show profile if auth returns user', () => {
        ui.init();

        const loginBtn = root.querySelector('#login-btn') as HTMLElement;
        const userProfile = root.querySelector('#user-profile') as HTMLElement;

        // Simulate Auth finishing with a user
        if (mockAuthCallback) {
            mockAuthCallback({ uid: '123', displayName: 'TestUser' });
        }

        expect(loginBtn.style.display).toBe('none');
        expect(userProfile.style.display).toBe('flex');
    });
});
