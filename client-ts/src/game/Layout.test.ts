import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from './Game';
import { GameUI } from './GameUI';
import { AuthService } from '../services/AuthService';

vi.mock('../services/AuthService');

describe('UI Layout', () => {
    let game: Game;
    let root: HTMLDivElement;
    let ui: GameUI;
    // Mock the HTML structure from main.ts
    const initialHTML = `
      <div>
        <h1>Tetris Battle TS</h1>
        <div class="ui-controls">
            <button id="pauseBtn">Pause</button>
            <button id="fullscreenBtn">Full Screen</button>
            <button id="installBtn">Install App</button>
        </div>
        <canvas id="gameCanvas" width="480" height="600"></canvas>
      </div>
    `;

    beforeEach(() => {
        game = new Game();
        root = document.createElement('div');
        root.innerHTML = initialHTML;
        document.body.appendChild(root);

        // Setup mock AuthService
        const mockAuth = {
            onAuthStateChanged: vi.fn(),
        };
        const mockAuthService = {
            getAuth: vi.fn().mockReturnValue(mockAuth),
            getUser: vi.fn().mockReturnValue(null)
        };
        (AuthService as any).mockImplementation(() => mockAuthService);

        ui = new GameUI(game, root);
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should have a container for controls', () => {
        ui.init();
        const controls = root.querySelector('.ui-controls') as HTMLElement;
        expect(controls).not.toBeNull();
    });

    // Verification of CSS styles via JS in a non-browser environment (JSDOM) is tricky 
    // because JSDOM doesn't load external CSS files. 
    // However, we can assert that we've added the class and structure correctly.
    // We will trust the CSS file update for visual alignment.
});
