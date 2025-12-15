import { Game } from './Game';

export class GameUI {
    private game: Game;
    private root: HTMLElement;
    private menu: HTMLElement | null = null;
    private pauseBtn: HTMLButtonElement | null = null;

    constructor(game: Game, root: HTMLElement) {
        this.game = game;
        this.root = root;
    }

    init() {
        // 1. Setup Pause Button
        this.pauseBtn = this.root.querySelector('#pauseBtn');
        if (!this.pauseBtn) {
            this.pauseBtn = document.createElement('button');
            this.pauseBtn.id = 'pauseBtn';
            this.pauseBtn.textContent = 'Pause';
            const controls = this.root.querySelector('.ui-controls');
            if (controls) {
                controls.appendChild(this.pauseBtn);
            } else {
                this.root.appendChild(this.pauseBtn);
            }
        }

        // 1.5 Setup Mode Display
        let modeDisplay = this.root.querySelector('#modeDisplay');
        if (!modeDisplay) {
            modeDisplay = document.createElement('div');
            modeDisplay.id = 'modeDisplay';
            modeDisplay.style.marginLeft = '1rem';
            modeDisplay.style.display = 'inline-block';

            const controls = this.root.querySelector('.ui-controls');
            if (controls) {
                controls.appendChild(modeDisplay);
            } else {
                this.root.appendChild(modeDisplay);
            }
        }
        modeDisplay.textContent = `Mode: ${this.game.mode}`;

        // 2. Create Menu
        // Styles are handled in style.css targeting #pauseMenu
        this.menu = document.createElement('div');
        this.menu.id = 'pauseMenu';
        this.menu.style.display = 'none';

        const createMenuItem = (id: string, text: string, onClick?: () => void) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.textContent = text;
            if (onClick) {
                btn.addEventListener('click', onClick);
            }
            return btn;
        };

        const restartBtn = createMenuItem('menuRestartBtn', 'Restart', () => {
            this.game.restart();
            this.hideMenu();
            this.updatePauseBtnText();
        });

        const ghostBtn = createMenuItem('menuGhostBtn', `Ghost Piece: ${this.game.ghostPieceEnabled ? 'ON' : 'OFF'}`, () => {
            this.game.toggleGhostPiece();
            ghostBtn.textContent = `Ghost Piece: ${this.game.ghostPieceEnabled ? 'ON' : 'OFF'}`;
        });

        const renameBtn = createMenuItem('menuRenameBtn', 'Rename (Next feature)');
        // renameBtn.disabled = true;

        const quitBtn = createMenuItem('menuQuitBtn', 'Quit', () => {
            console.log('Quit clicked');
            alert('Quit not implemented');
        });

        this.menu.appendChild(restartBtn);
        this.menu.appendChild(ghostBtn);
        this.menu.appendChild(renameBtn);
        this.menu.appendChild(quitBtn);

        this.root.appendChild(this.menu);

        // 3. Bind Events
        this.pauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
            this.pauseBtn?.blur();
        });
    }

    toggleMenu() {
        if (this.game.isPaused) {
            this.game.togglePause();
            this.hideMenu();
        } else {
            this.game.togglePause();
            this.showMenu();
        }
    }

    showMenu() {
        if (this.menu) this.menu.style.display = 'flex'; // Use flex to align items vertically
        this.updatePauseBtnText();
    }

    hideMenu() {
        if (this.menu) this.menu.style.display = 'none';
        this.updatePauseBtnText();
    }

    updatePauseBtnText() {
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.game.isPaused ? 'Resume' : 'Pause';
        }
    }
}
