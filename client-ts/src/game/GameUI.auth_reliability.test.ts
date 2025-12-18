import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameUI } from './GameUI';
import { Game } from './Game';

// Mock AuthService
vi.mock('../services/AuthService', () => {
    return {
        AuthService: vi.fn().mockImplementation(() => ({
            getAuth: vi.fn(),
            signInWithGoogle: vi.fn(),
            logout: vi.fn(),
            getUser: vi.fn().mockReturnValue(null) // Default no user
        }))
    };
});

describe('GameUI Auth Reliability', () => {
    let game: Game;
    let root: HTMLElement;
    let ui: GameUI;
    let mockAuthService: any;

    beforeEach(() => {
        // Reset DOM
        root = document.createElement('div');
        root.innerHTML = '<div class="ui-controls"></div><p id="desc">Description</p>';
        document.body.appendChild(root);

        // Mock Game
        game = {
            setAuthService: vi.fn(),
            setPlayerName: vi.fn(),
            setPlayerMetadata: vi.fn(),
            mode: 0, // OFFLINE
            leaderboard: {
                mergeLocalScoresToUser: vi.fn(),
                getTopScores: vi.fn().mockReturnValue([]),
                getOnlineScores: vi.fn().mockResolvedValue([])
            }
        } as unknown as Game;

        // Instantiate UI
        ui = new GameUI(game, root);
        // Get the mocked instance from the private property or strict mock approach
        // Since we mocked the module, new AuthService() in GameUI constructor returns our mock.
        mockAuthService = (ui as any).authService;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    it('Scenario 1: Offline Fallback - handles missing Auth config gracefully', () => {
        // Setup: getAuth returns undefined (Offline mode)
        mockAuthService.getAuth.mockReturnValue(undefined);

        // Act
        ui.init();

        // Assert
        const loginBtn = root.querySelector('#login-btn') as HTMLButtonElement;
        // createHomeMenu runs first, effectively creating the button
        expect(loginBtn).not.toBeNull();

        // Then the offline logic runs
        expect(loginBtn.style.display).toBe('none');
        expect(loginBtn.disabled).toBe(true);
        expect(loginBtn.textContent).toBe('Login Unavailable (Offline)');
    });

    it('Scenario 2: Race Condition - updateAuthUI called before UI elements exist', () => {
        // Setup: We do NOT call ui.init(), so createHomeMenu() hasn't run.
        // this.loginBtn and this.userProfile should be null/undefined.

        const user = { uid: 'u1', displayName: 'Test', photoURL: null };

        // Act & Assert: Should not throw
        expect(() => {
            ui.updateAuthUI(user);
        }).not.toThrow();

        // Also verify for null user (Logout flow)
        expect(() => {
            ui.updateAuthUI(null);
        }).not.toThrow();
    });

    it('Scenario 3: Initialization Timing - Offline logic safe if button is missing', () => {
        // Setup: Offline mode
        mockAuthService.getAuth.mockReturnValue(undefined);

        // But force createHomeMenu to NOT create the button (simulate partial failure or UI change)
        // We can spy on createHomeMenu, but simpler is to let it run, then delete the button *before* the auth check? 
        // Cannot easily interrupt init(). 
        // Instead, we can mock createHomeMenu to do nothing.
        const originalCreateHomeMenu = (ui as any).createHomeMenu;
        (ui as any).createHomeMenu = vi.fn(); // Logic inside init will run, calls empty fn.

        // Act
        expect(() => {
            ui.init();
        }).not.toThrow();

        // Warning should have logged but no crash trying to access properties of null loginBtn
        (ui as any).createHomeMenu = originalCreateHomeMenu; // Restore
    });
});
