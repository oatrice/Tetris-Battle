import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';

describe('Game Navigation Flow', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');
        ui = new GameUI(game, root);
        ui.init();
    });

    it('should show Home screen and NOT Game Over screen when Quit to Home is clicked', () => {
        // Start game
        ui.startGame();

        // Open Pause Menu
        const pauseBtn = root.querySelector('#pauseBtn') as HTMLButtonElement;
        pauseBtn.click();

        // Click Quit to Home
        const homeBtn = root.querySelector('#menuHomeBtn') as HTMLButtonElement;
        expect(homeBtn).not.toBeNull();
        homeBtn.click();

        // Check states
        const homeMenu = root.querySelector('#homeMenu') as HTMLElement;
        // const gameOverMenu = root.querySelector('#gameOverMenu') as HTMLElement; // Unused

        expect(homeMenu.style.display).not.toBe('none'); // Should be visible

        // In the current implementation, this is expected to FAIL because Quit sets gameOver=true
        // and main.ts (not tested here, but implied logic) or GameUI might show it.
        // Wait, main.ts is what calls showGameOver(). This unit test doesn't run main.ts loop.
        // But we can check game state.

        // If game.gameOver is true, the main loop WILL show the game over screen.
        expect(game.gameOver).toBe(false);
    });

    it('should hide Game Over menu when starting a new game', () => {
        // Simulate Game Over state
        ui.showGameOver();
        const gameOverMenu = root.querySelector('#gameOverMenu') as HTMLElement;
        expect(gameOverMenu.style.display).toBe('flex');

        // Start Game (Solo)
        ui.startGame();

        expect(gameOverMenu.style.display).toBe('none');
    });
});
