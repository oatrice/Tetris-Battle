import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { GameMode } from './GameMode';

// Mock the virtual module
vi.mock('virtual:version-info', () => {
    return {
        APP_VERSION: '1.0.0',
        COMMIT_HASH: 'initial_mock_hash',
        COMMIT_DATE: 'initial_mock_date'
    };
});

// Import the mocked module to modify its values
import * as VersionInfo from 'virtual:version-info';

describe('GameUI', () => {
    let game: Game;
    let ui: GameUI;
    let root: HTMLElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app"></div>';
        root = document.getElementById('app')!;
        game = new Game();
        ui = new GameUI(game, root);

        // Reset mock values to defaults
        (VersionInfo as any).APP_VERSION = '1.0.0';
        (VersionInfo as any).COMMIT_HASH = 'initial_mock_hash';
        (VersionInfo as any).COMMIT_DATE = 'initial_mock_date';
    });

    it('should create a pause menu hidden by default', () => {
        ui.init();
        const menu = root.querySelector('#pauseMenu');
        expect(menu).not.toBeNull();
        // Use window.getComputedStyle or just check style property if set directly
        expect((menu as HTMLElement).style.display).toBe('none');
    });

    it('should toggle menu display when pause button is clicked', () => {
        ui.init();
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;
        const menu = root.querySelector('#pauseMenu') as HTMLElement;

        pauseBtn.click();
        expect(menu.style.display).toBe('flex');
        expect(game.isPaused).toBe(true);

        pauseBtn.click();
        expect(menu.style.display).toBe('none');
        expect(game.isPaused).toBe(false);
    });

    it('should have Resume, Restart, and Rename options in the menu', () => {
        ui.init();
        const menu = root.querySelector('#pauseMenu') as HTMLElement;

        expect(menu.textContent).toContain('Resume');
        expect(menu.textContent).toContain('Restart');
        expect(menu.textContent).toContain('Rename');
        expect(menu.textContent).toContain('Leaderboard');
    });

    it('should restart game when Restart option is clicked', () => {
        ui.init();
        const restartSpy = vi.spyOn(game, 'restart');
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;

        // Open menu
        pauseBtn.click();

        const restartBtn = root.querySelector('#menuRestartBtn') as HTMLButtonElement;
        expect(restartBtn).not.toBeNull();

        restartBtn.click();
        expect(restartSpy).toHaveBeenCalled();

        // Should also hide menu and unpause optionally, or stay paused? 
        // Usually restart resets everything including pause state to playing.
        // Game.start() sets isPaused = false.
        const menu = root.querySelector('#pauseMenu') as HTMLElement;
        expect(menu.style.display).toBe('none');
        expect(game.isPaused).toBe(false);
    });

    it('should toggle ghost piece setting when Ghost Piece option is clicked', () => {
        ui.init();
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;

        // Open menu
        pauseBtn.click();

        const ghostBtn = root.querySelector('#menuGhostBtn') as HTMLButtonElement;
        expect(ghostBtn).not.toBeNull();
        expect(ghostBtn.textContent).toBe('Ghost Piece: ON');

        // Click to toggle OFF
        ghostBtn.click();
        expect(ghostBtn.textContent).toBe('Ghost Piece: OFF');
        expect(game.ghostPieceEnabled).toBe(false);

        // Click to toggle ON
        ghostBtn.click();
        expect(ghostBtn.textContent).toBe('Ghost Piece: ON');
        expect(game.ghostPieceEnabled).toBe(true);
    });

    it('should display player info near description', () => {
        ui.init();

        const modeDisplay = root.querySelector('#modeDisplay');
        expect(modeDisplay).not.toBeNull();
        // Just ensure it exists for now, precise DOM placement logic will be updated in GameUI
    });

    it('should display version info in dev mode', () => {
        ui.init();
        const modeDisplay = root.querySelector('#modeDisplay');
        // In test environment, import.meta.env.PROD is false, so it should show version
        expect(modeDisplay?.textContent).toBeTruthy();

        // Also check Home Menu
        const homeMenu = root.querySelector('#homeMenu');
        expect(homeMenu?.innerHTML).toContain(`v${VersionInfo.APP_VERSION} `);
    });

    it('should quit to home when Quit to Home option is clicked', () => {
        ui.init();
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;

        // Start game via UI to ensure proper state transition
        ui.startGame();

        // Check initial state: Home hidden, Pause visible
        const homeMenu = root.querySelector('#homeMenu') as HTMLElement;
        expect(homeMenu.style.display).toBe('none');

        // Open menu
        pauseBtn.click();

        const quitBtn = root.querySelector('#menuHomeBtn') as HTMLButtonElement;
        expect(quitBtn).not.toBeNull();
        expect(quitBtn.textContent).toBe('Quit to Home');

        // Click quit
        quitBtn.click();

        // Expect: Home visible, Game "stopped" (gameOver=false but paused), Pause button hidden
        expect(homeMenu.style.display).toBe('flex');
        expect(game.gameOver).toBe(false);
        expect(game.isPaused).toBe(true);
        expect(pauseBtn.style.display).toBe('none');

        const menu = root.querySelector('#pauseMenu') as HTMLElement;
        expect(menu.style.display).toBe('none');
    });
    it('should display the current game mode in the HUD', () => {
        ui.init();

        // Default mode (Offline/Normal)
        ui.startGame();
        let modeDisplay = root.querySelector('#modeDisplay');
        expect(modeDisplay?.textContent).toContain('Normal');

        // Special mode
        ui.startGame(GameMode.SPECIAL);
        modeDisplay = root.querySelector('#modeDisplay');
        expect(modeDisplay?.textContent).toContain('Special');
    });


    it('should display git date for clean commits', () => {
        (VersionInfo as any).COMMIT_HASH = 'abc1234';
        const fixedDate = '2023-01-01T10:00:00.000Z';
        (VersionInfo as any).COMMIT_DATE = fixedDate;

        ui.init();
        ui.startGame();

        const modeDisplay = root.querySelector('#modeDisplay');
        const expectedDateStr = new Date(fixedDate).toLocaleString();

        expect(modeDisplay?.textContent).toContain('abc1234');
        expect(modeDisplay?.textContent).toContain(expectedDateStr);
    });

    it('Runtime Clock Override: should use current runtime timestamp for HMR/dirty updates (ignoring COMMIT_DATE)', () => {
        (VersionInfo as any).COMMIT_HASH = 'now';
        // Provide a stale date to simulate cached build info
        const staleDate = '2020-01-01T10:00:00.000Z';
        (VersionInfo as any).COMMIT_DATE = staleDate;

        // Mock runtime clock to a specific new time
        const runtimeDate = new Date('2025-12-25T12:00:00.000Z');
        vi.useFakeTimers();
        vi.setSystemTime(runtimeDate);

        ui.init();
        ui.startGame();

        const modeDisplay = root.querySelector('#modeDisplay');
        const expectedRuntimeDateStr = runtimeDate.toLocaleString();
        const staleDateStr = new Date(staleDate).toLocaleString();

        // It should use the runtime clock, not the stale info
        expect(modeDisplay?.textContent).toContain(expectedRuntimeDateStr);
        expect(modeDisplay?.textContent).not.toContain(staleDateStr);
        expect(modeDisplay?.textContent).toContain('Dev Changes (HMR)');

        vi.useRealTimers();
    });
    it('should sanitize player name in HUD to prevent XSS', () => {
        const maliciousName = '<img src=x onerror=alert(1)>';
        // Directly set on game instance to mock data source
        game.setPlayerName(maliciousName);

        ui.init();
        const modeDisplay = root.querySelector('#modeDisplay');

        // Should render as text, not HTML
        // textContent decodes entities, so it should match the input string exactly
        expect(modeDisplay?.textContent).toContain(maliciousName);
        // innerHTML should ideally contain escaped entities like &lt;img
        expect(modeDisplay?.innerHTML).not.toContain('<img src=x');
    });

    it('should handle missing or malformed COMMIT_DATE gracefully', () => {
        (VersionInfo as any).COMMIT_DATE = 'invalid-date-string';

        ui.init();
        ui.startGame();

        const modeDisplay = root.querySelector('#modeDisplay');

        // Should fallback to a safe default
        expect(modeDisplay?.textContent).not.toContain('Invalid Date');
        expect(modeDisplay?.textContent).toContain('Unknown Date');
    });
});
