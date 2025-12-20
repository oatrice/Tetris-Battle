/**
 * @file GameUILoadingState.test.ts
 * @description TDD Tests for Loading States of Install App and Login buttons
 * 
 * Test Scenarios:
 * 1. Install App button shows "Checking..." initially
 * 2. Install App button shows "📲 Install App" when PWA is installable
 * 3. Login button shows "Loading..." initially
 * 4. Login button shows "Login with Google" when Auth is ready
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { GameUI } from './GameUI';
import { Game } from './Game';

describe('GameUI - Loading State (Install & Login Buttons)', () => {
    let dom: JSDOM;
    let container: HTMLElement;
    let game: Game;
    let ui: GameUI;

    beforeEach(() => {
        dom = new JSDOM(`<!DOCTYPE html><div id="app"></div>`);
        global.document = dom.window.document as any;
        global.window = dom.window as any;
        global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            imageSmoothingEnabled: false,
        })) as any;

        container = dom.window.document.querySelector('#app') as HTMLElement;
        game = new Game();
        ui = new GameUI(game, container);
    });

    describe('Install App Button Loading State', () => {
        it('should show "Checking PWA..." text initially before beforeinstallprompt fires', () => {
            ui.init();

            const btnInstall = container.querySelector('#btnInstall') as HTMLButtonElement;
            expect(btnInstall).toBeTruthy();
            expect(btnInstall.textContent).toBe('📲 Checking PWA...');
            expect(btnInstall.style.display).not.toBe('none'); // Should be visible with loading text
            expect(btnInstall.disabled).toBe(true); // Should be disabled while checking
        });

        it('should update to "📲 Install App" when beforeinstallprompt fires', () => {
            ui.init();

            const btnInstall = container.querySelector('#btnInstall') as HTMLButtonElement;
            expect(btnInstall.textContent).toBe('📲 Checking PWA...');

            // Simulate beforeinstallprompt event
            const mockEvent = new Event('beforeinstallprompt') as any;
            mockEvent.preventDefault = vi.fn();
            mockEvent.prompt = vi.fn();
            mockEvent.userChoice = Promise.resolve({ outcome: 'accepted' });

            global.window.dispatchEvent(mockEvent);

            expect(btnInstall.textContent).toBe('📲 Install App');
            expect(btnInstall.disabled).toBe(false);
            expect(btnInstall.style.display).toBe('block');
        });

        it('should hide button after timeout if PWA is not installable', async () => {
            vi.useFakeTimers();
            ui.init();

            const btnInstall = container.querySelector('#btnInstall') as HTMLButtonElement;
            expect(btnInstall.textContent).toBe('📲 Checking PWA...');

            // Wait for timeout (e.g., 3 seconds)
            vi.advanceTimersByTime(3000);

            expect(btnInstall.style.display).toBe('none');
            vi.useRealTimers();
        });
    });

    describe('Login Button Loading State', () => {
        it('should show "Loading..." text initially before Auth is ready', () => {
            ui.init();

            const loginBtn = container.querySelector('#login-btn') as HTMLButtonElement;
            expect(loginBtn).toBeTruthy();
            expect(loginBtn.textContent).toBe('🔄 Loading Auth...');
            expect(loginBtn.style.display).not.toBe('none'); // Should be visible
            expect(loginBtn.disabled).toBe(true); // Should be disabled while loading
        });

        it('should update to "Login with Google" when Auth is ready and no user is signed in', () => {
            ui.init();

            const loginBtn = container.querySelector('#login-btn') as HTMLButtonElement;
            expect(loginBtn.textContent).toBe('🔄 Loading Auth...');

            // Simulate Auth ready with no user
            ui.updateAuthUI(null);

            expect(loginBtn.textContent).toBe('Login with Google');
            expect(loginBtn.disabled).toBe(false);
            expect(loginBtn.style.display).toBe('block');
        });

        it('should hide login button when user is authenticated', () => {
            ui.init();

            const loginBtn = container.querySelector('#login-btn') as HTMLButtonElement;
            const userProfile = container.querySelector('#user-profile') as HTMLElement;

            // Simulate authenticated user
            const mockUser = {
                uid: 'test-uid',
                displayName: 'Test User',
                photoURL: 'https://example.com/avatar.jpg'
            };

            ui.updateAuthUI(mockUser);

            expect(loginBtn.style.display).toBe('none');
            expect(userProfile.style.display).toBe('flex');
        });

        it('should show "Login Unavailable (Offline)" when Auth is not configured', () => {
            // Mock authService.getAuth() to return undefined
            vi.spyOn(ui['authService'], 'getAuth').mockReturnValue(undefined);

            ui.init();

            const loginBtn = container.querySelector('#login-btn') as HTMLButtonElement;
            expect(loginBtn.textContent).toBe('Login Unavailable (Offline)');
            expect(loginBtn.disabled).toBe(true);
            expect(loginBtn.style.display).toBe('none'); // Hidden in offline mode
        });
    });
});
