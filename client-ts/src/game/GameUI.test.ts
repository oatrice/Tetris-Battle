import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';

describe('GameUI', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');

        // Setup initial DOM as expected by GameUI
        // We assume GameUI will populate or expect these elements.
        // For this refactor, let's say GameUI initializes the necessary menu structure 
        // if it doesn't exist, or we check against what it *should* do.

        // Let's assume we pass the root container where the app lives.
        ui = new GameUI(game, root);
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

    it('should display the current game mode', () => {
        ui.init();
        // Assume there's an element defining the mode
        const modeDisplay = root.querySelector('#modeDisplay');
        expect(modeDisplay).not.toBeNull();
        expect(modeDisplay?.textContent).toContain('Mode: OFFLINE');
    });
});
