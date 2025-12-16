import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';

describe('GameUI Game Over', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');
        ui = new GameUI(game, root);
        ui.init();
    });

    it('should create a game over menu hidden by default', () => {
        const menu = root.querySelector('#gameOverMenu');
        expect(menu).not.toBeNull();
        expect((menu as HTMLElement).style.display).toBe('none');
    });

    it('should show game over menu when showGameOver() is called', () => {
        ui.showGameOver();
        const menu = root.querySelector('#gameOverMenu') as HTMLElement;
        expect(menu.style.display).toBe('flex');
    });

    it('should have Restart button in game over menu', () => {
        const menu = root.querySelector('#gameOverMenu') as HTMLElement;
        const restartBtn = menu.querySelector('#gameOverRestartBtn');
        expect(restartBtn).not.toBeNull();
    });

    it('should restart game and hide menu when Restart is clicked on Game Over screen', () => {
        const restartSpy = vi.spyOn(game, 'restart');

        ui.showGameOver();
        const restartBtn = root.querySelector('#gameOverRestartBtn') as HTMLButtonElement;

        restartBtn.click();

        expect(restartSpy).toHaveBeenCalled();
        const menu = root.querySelector('#gameOverMenu') as HTMLElement;
        expect(menu.style.display).toBe('none');
    });
});
