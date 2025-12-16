import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';

describe('HomePage', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');
        ui = new GameUI(game, root);
        ui.init();
    });

    it('should show home page on initialization', () => {
        const homeMenu = root.querySelector('#homeMenu') as HTMLElement;
        expect(homeMenu).not.toBeNull();
        // It should be visible
        expect(homeMenu.style.display).not.toBe('none');
    });

    it('should have required buttons on home page', () => {
        const homeMenu = root.querySelector('#homeMenu') as HTMLElement;
        expect(homeMenu).not.toBeNull();

        const buttons = [
            '#btnSolo',
            '#btnSpecial',
            // '#btnOnline',
            // '#btnComputer',
            '#btnChangeName',
            '#btnLeaderboard'
        ];

        buttons.forEach(id => {
            const btn = homeMenu.querySelector(id);
            expect(btn, `Button ${id} should exist`).not.toBeNull();
        });

        // Ensure hidden buttons are not present
        expect(homeMenu.querySelector('#btnOnline')).toBeNull();
        expect(homeMenu.querySelector('#btnComputer')).toBeNull();
    });

    it('should start solo game when Solo button is clicked', () => {
        const homeMenu = root.querySelector('#homeMenu') as HTMLElement;
        const btnSolo = homeMenu.querySelector('#btnSolo') as HTMLButtonElement;
        const spyStart = vi.spyOn(game, 'start');

        btnSolo.click();

        expect(spyStart).toHaveBeenCalled();
        expect(homeMenu.style.display).toBe('none');
    });
});
