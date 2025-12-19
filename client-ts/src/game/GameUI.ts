import { Game } from './Game';
import { GameMode } from './GameMode';
import { Renderer } from './Renderer';
import { APP_VERSION, COMMIT_HASH, COMMIT_DATE } from 'virtual:version-info';
import { AuthService } from '../services/AuthService';
import type { CoopGame } from '../coop/CoopGame';
import type { CoopRenderer } from './CoopRenderer';
import type { CoopInputHandler } from '../coop/CoopInputHandler';
import type { RoomInfo } from '../coop/RoomManager';

export class GameUI {
    private game: Game;
    private root: HTMLElement;
    private menu: HTMLElement | null = null;
    private homeMenu: HTMLElement | null = null;

    // Auth & Profile
    private authService: AuthService;
    private userProfile: HTMLElement | null = null;
    private loginBtn: HTMLButtonElement | null = null;

    // Controls
    private pauseBtn: HTMLButtonElement | null = null;

    // New UI Elements
    private nextCanvas: HTMLCanvasElement | null = null;
    private holdCanvas: HTMLCanvasElement | null = null;
    private scoreVal: HTMLElement | null = null;
    private linesVal: HTMLElement | null = null;
    private levelVal: HTMLElement | null = null;

    // Coop Mode
    private coopGame: CoopGame | null = null;
    private coopRenderer: CoopRenderer | null = null;
    private coopInputHandler: CoopInputHandler | null = null;

    constructor(game: Game, root: HTMLElement) {
        this.game = game;
        this.root = root;
        this.authService = new AuthService();
        this.game.setAuthService(this.authService);
    }

    init() {
        console.log('[GameUI] Initializing UI...');
        console.log('[GameUI] Version Info:', {
            version: APP_VERSION,
            hash: COMMIT_HASH,
            date: COMMIT_DATE
        });

        // 1. Setup UI Elements Binding (New Panels)
        this.nextCanvas = this.root.querySelector('#nextCanvas');
        this.holdCanvas = this.root.querySelector('#holdCanvas');
        this.scoreVal = this.root.querySelector('#score-value');
        this.linesVal = this.root.querySelector('#lines-value');
        this.levelVal = this.root.querySelector('#level-value');

        // 2. Setup Home Menu
        this.createHomeMenu();

        // 3. Auth Listener
        const auth = this.authService.getAuth();
        if (auth) {
            auth.onAuthStateChanged((user) => {
                this.updateAuthUI(user);
            });
        } else {
            console.warn('[GameUI] Auth not configured. UI will be in offline mode.');
            if (this.loginBtn) {
                this.loginBtn.style.display = 'none';
                this.loginBtn.disabled = true;
                this.loginBtn.textContent = 'Login Unavailable (Offline)';
            }
        }

        // 4. Setup Pause Button
        this.pauseBtn = this.root.querySelector('#pauseBtn');
        if (!this.pauseBtn) {
            this.pauseBtn = document.createElement('button');
            this.pauseBtn.id = 'pauseBtn';
            this.pauseBtn.textContent = 'Pause';
            this.pauseBtn.style.display = 'none';
            const controls = this.root.querySelector('.ui-controls');
            if (controls) {
                controls.appendChild(this.pauseBtn);
            } else {
                this.root.appendChild(this.pauseBtn);
            }
        } else {
            this.pauseBtn.style.display = 'none';
        }

        // 5. Setup Mode Display
        let modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (!modeDisplay) {
            modeDisplay = document.createElement('div');
            modeDisplay.id = 'modeDisplay';
            modeDisplay.style.marginTop = '1rem';
            modeDisplay.style.display = 'none';
            modeDisplay.style.marginBottom = '0.5rem';
            const descriptionRef = this.root.querySelector('p');
            if (descriptionRef && descriptionRef.parentNode) {
                descriptionRef.parentNode.insertBefore(modeDisplay, descriptionRef);
            } else {
                this.root.appendChild(modeDisplay);
            }
        }
        this.updateModeDisplay();

        // 6. Create Menus
        this.createPauseMenu();
        this.createGameOverMenu();
        this.createLeaderboardOverlay();

        // 7. Bind Events
        this.pauseBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
            this.pauseBtn?.blur();
        });

        // 8. Mobile Enhancements
        this.preventPullToRefresh();

        // 9. Auto Save
        this.setupAutoSave();

        // Initial Stats Render
        this.updateStats();
    }

    public updateStats() {
        if (this.scoreVal) this.scoreVal.textContent = this.game.score.toString();
        if (this.linesVal) this.linesVal.textContent = this.game.lines.toString();
        if (this.levelVal) this.levelVal.textContent = this.game.level.toString();

        this.drawPieceToCanvas(this.nextCanvas, this.game.nextPiece);

        const holdPanel = this.root.querySelector<HTMLElement>('#hold-panel');
        if (this.game.mode === GameMode.SPECIAL) {
            if (holdPanel) holdPanel.style.display = 'flex';
            this.drawPieceToCanvas(this.holdCanvas, this.game.holdPiece, !this.game.canHold);
        } else {
            if (holdPanel) holdPanel.style.display = 'none';
        }
    }

    private drawPieceToCanvas(canvas: HTMLCanvasElement | null, piece: any, isDimmed: boolean = false) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Ensure crisp edges for high-res canvas
        ctx.imageSmoothingEnabled = false;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (piece) {
            const color = Renderer.getColor(piece.type);
            // Dynamic cell size to fit 4-block wide pieces with padding
            const cellSize = Math.floor(canvas.width / 5);

            const pieceWidth = piece.shape[0].length * cellSize;
            const pieceHeight = piece.shape.length * cellSize;
            const offsetX = (canvas.width - pieceWidth) / 2;
            const offsetY = (canvas.height - pieceHeight) / 2;

            piece.shape.forEach((row: number[], r: number) => {
                row.forEach((cell: number, c: number) => {
                    if (cell !== 0) {
                        ctx.fillStyle = isDimmed ? '#555' : color;
                        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
                        // Optional border for clarity
                        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                        ctx.strokeRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
                    }
                });
            });
        }
    }

    private setupAutoSave() {
        window.addEventListener('blur', () => {
            if (!this.game.gameOver && !this.game.isPaused) {
                this.game.isPaused = true;
                this.updatePauseBtnText();
                this.showMenu();
            }
            this.game.saveState();
        });

        window.addEventListener('beforeunload', () => {
            if (!this.game.gameOver) {
                this.game.isPaused = true;
            }
            this.game.saveState();
        });

        window.addEventListener('focus', () => {
            this.game.loadState();
            this.updatePauseBtnText();
            if (this.game.isPaused) {
                this.showMenu();
            }
        });
    }

    private preventPullToRefresh() {
        document.body.style.overscrollBehaviorY = 'none';
        document.body.style.touchAction = 'none';

        window.addEventListener('touchmove', (e) => {
            const target = e.target as HTMLElement;
            // Check if user is trying to scroll a scrollable container
            let isScrollable = false;
            let el = target;

            while (el && el !== document.body) {
                // specialized check for our leaderboard list or any other explicit scroll container
                if (el.style.overflowY === 'auto' || el.style.overflowY === 'scroll') {
                    if (el.scrollHeight > el.clientHeight) {
                        isScrollable = true;
                        break;
                    }
                }
                el = el.parentElement as HTMLElement;
            }

            if (isScrollable) return;

            if (window.scrollY === 0 && e.touches[0].clientY > 0 && e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    private createHomeMenu() {
        this.homeMenu = document.createElement('div');
        this.homeMenu.id = 'homeMenu';
        this.homeMenu.classList.add('home-menu');

        const title = document.createElement('h1');
        title.textContent = 'Tetris Battle';
        title.classList.add('home-menu-title');
        this.homeMenu.appendChild(title);

        // --- Auth UI Start ---
        const authContainer = document.createElement('div');
        authContainer.id = 'authContainer';
        authContainer.style.marginBottom = '1rem';
        authContainer.style.display = 'flex';
        authContainer.style.flexDirection = 'column';
        authContainer.style.alignItems = 'center';
        authContainer.style.gap = '10px';

        this.userProfile = document.createElement('div');
        this.userProfile.id = 'user-profile';
        this.userProfile.style.display = 'none';
        this.userProfile.style.alignItems = 'center';
        this.userProfile.style.gap = '10px';

        const avatar = document.createElement('img');
        avatar.id = 'user-avatar';
        avatar.style.width = '40px';
        avatar.style.height = '40px';
        avatar.style.borderRadius = '50%';
        this.userProfile.appendChild(avatar);

        const userName = document.createElement('span');
        userName.id = 'user-name';
        userName.style.fontWeight = 'bold';
        this.userProfile.appendChild(userName);

        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.fontSize = '0.8rem';
        logoutBtn.style.padding = '5px 10px';
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                this.authService.logout().catch(console.error);
            }
        });
        this.userProfile.appendChild(logoutBtn);

        this.loginBtn = document.createElement('button');
        this.loginBtn.id = 'login-btn';
        this.loginBtn.textContent = 'Login with Google';
        this.loginBtn.className = 'menu-btn';
        this.loginBtn.style.background = '#4285F4';
        this.loginBtn.style.fontSize = '1rem';
        this.loginBtn.style.display = 'none';
        this.loginBtn.addEventListener('click', () => {
            this.authService.signInWithGoogle()
                .then(user => this.updateAuthUI(user))
                .catch(err => console.error("Login failed", err));
        });

        authContainer.appendChild(this.userProfile);
        authContainer.appendChild(this.loginBtn);
        this.homeMenu.appendChild(authContainer);
        // --- Auth UI End ---

        const createBtn = (id: string, text: string, onClick: () => void) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.textContent = text;
            btn.className = 'menu-btn';
            btn.addEventListener('click', onClick);
            return btn;
        };

        const btnSolo = createBtn('btnSolo', 'Solo Mode (Normal)', () => {
            this.startGame();
        });

        const btnSpecial = createBtn('btnSpecial', 'Special Mode', () => {
            this.startGame(GameMode.SPECIAL);
        });

        const btnCoop = createBtn('btnCoop', '🎮 Coop Mode (2 Players)', () => {
            this.showCoopMenu();
        });

        const btnChangeName = createBtn('btnChangeName', 'Change Name', () => {
            this.promptRename();
        });

        const btnLeaderboard = createBtn('btnLeaderboard', 'Leaderboard', () => {
            this.showLeaderboard();
        });

        this.homeMenu.appendChild(btnSolo);
        this.homeMenu.appendChild(btnSpecial);
        this.homeMenu.appendChild(btnCoop);
        this.homeMenu.appendChild(btnChangeName);
        this.homeMenu.appendChild(btnLeaderboard);

        const versionInfo = document.createElement('div');
        versionInfo.style.marginTop = '1rem';
        versionInfo.style.fontSize = '0.8rem';
        versionInfo.style.color = '#666';

        if (import.meta.env.PROD) {
            versionInfo.textContent = `v${APP_VERSION}`;
        } else {
            const dateStr = new Date(COMMIT_DATE).toLocaleString();
            const now = new Date().toLocaleString();
            const cleanHash = String(COMMIT_HASH).trim();
            const hashDisplay = cleanHash === 'now' ? 'Dev Changes (HMR)' : cleanHash;
            const dateDisplay = cleanHash === 'now' ? now : dateStr;
            versionInfo.innerHTML = `v${APP_VERSION} (${hashDisplay})<br>Last Update: ${dateDisplay}`;
        }
        this.homeMenu.appendChild(versionInfo);

        this.root.appendChild(this.homeMenu);
    }

    updateAuthUI(user: any | null) {
        if (user) {
            if (this.loginBtn) this.loginBtn.style.display = 'none';
            if (this.userProfile) {
                this.userProfile.style.display = 'flex';
                const nameEl = this.userProfile.querySelector('#user-name');
                const avatarEl = this.userProfile.querySelector('img');
                if (nameEl) nameEl.textContent = user.displayName || 'User';
                const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPlU8L3RleHQ+PC9zdmc+';
                if (avatarEl) avatarEl.src = user.photoURL || defaultAvatar;

                this.game.setPlayerName(user.displayName || 'Player');
                this.game.setPlayerMetadata(user.uid, user.photoURL);
                this.game.leaderboard.mergeLocalScoresToUser(user.uid, user.photoURL);
            }
        } else {
            if (this.loginBtn) this.loginBtn.style.display = 'block';
            if (this.userProfile) this.userProfile.style.display = 'none';
            this.game.setPlayerName('Player');
            this.game.setPlayerMetadata(undefined, undefined);
        }
    }

    private createPauseMenu() {
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

        const renameBtn = createMenuItem('menuRenameBtn', 'Rename', () => {
            this.promptRename();
        });

        const leaderboardBtn = createMenuItem('menuLeaderboardBtn', 'Leaderboard', () => {
            this.showLeaderboard();
        });

        const resumeBtn = createMenuItem('menuResumeBtn', 'Resume', () => {
            this.toggleMenu();
        });

        const homeBtn = createMenuItem('menuHomeBtn', 'Quit to Home', () => {
            this.hideMenu();
            this.showHome();
        });

        this.menu.appendChild(resumeBtn);
        this.menu.appendChild(restartBtn);
        this.menu.appendChild(ghostBtn);
        this.menu.appendChild(renameBtn);
        this.menu.appendChild(leaderboardBtn);
        this.menu.appendChild(homeBtn);

        this.root.appendChild(this.menu);
    }

    private createGameOverMenu() {
        const menu = document.createElement('div');
        menu.id = 'gameOverMenu';
        menu.style.display = 'none';
        menu.classList.add('game-over-menu');

        menu.style.position = 'absolute';
        menu.style.top = '0';
        menu.style.left = '0';
        menu.style.width = '100%';
        menu.style.height = '100%';
        menu.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        menu.style.flexDirection = 'column';
        menu.style.justifyContent = 'center';
        menu.style.alignItems = 'center';
        menu.style.zIndex = '100';

        const title = document.createElement('h1');
        title.textContent = 'GAME OVER';
        title.style.color = 'white';
        title.style.fontSize = '3rem';
        title.style.marginBottom = '2rem';
        menu.appendChild(title);

        const statsContainer = document.createElement('div');
        statsContainer.style.display = 'flex';
        statsContainer.style.flexDirection = 'column';
        statsContainer.style.alignItems = 'center';
        statsContainer.style.marginBottom = '2rem';
        statsContainer.style.color = 'white';
        statsContainer.style.fontSize = '1.2rem';
        statsContainer.style.gap = '0.5rem';

        const playerName = document.createElement('div');
        playerName.id = 'gameOverPlayerName';
        statsContainer.appendChild(playerName);

        const score = document.createElement('div');
        score.id = 'gameOverScore';
        statsContainer.appendChild(score);

        const bestScore = document.createElement('div');
        bestScore.id = 'gameOverBestScore';
        bestScore.style.color = '#FFD700';
        statsContainer.appendChild(bestScore);

        menu.appendChild(statsContainer);

        const restartBtn = document.createElement('button');
        restartBtn.id = 'gameOverRestartBtn';
        restartBtn.textContent = 'Restart';
        restartBtn.className = 'menu-btn';
        restartBtn.style.fontSize = '1.5rem';
        restartBtn.style.padding = '15px 40px';
        restartBtn.style.border = 'none';
        restartBtn.style.borderRadius = '50px';
        restartBtn.style.background = 'linear-gradient(45deg, #FF512F 0%, #DD2476 100%)';
        restartBtn.style.color = 'white';
        restartBtn.style.cursor = 'pointer';
        restartBtn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        restartBtn.style.transition = 'transform 0.2s, box-shadow 0.2s';

        restartBtn.onmouseenter = () => {
            restartBtn.style.transform = 'translateY(-2px)';
            restartBtn.style.boxShadow = '0 15px 25px rgba(0,0,0,0.4)';
        };
        restartBtn.onmouseleave = () => {
            restartBtn.style.transform = 'translateY(0)';
            restartBtn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        };

        restartBtn.addEventListener('click', () => {
            this.game.restart();
            this.hideGameOver();
        });

        menu.appendChild(restartBtn);
        this.root.appendChild(menu);
        this.gameOverMenu = menu;
    }

    private gameOverMenu: HTMLElement | null = null;
    private leaderboardOverlay: HTMLElement | null = null;
    private leaderboardList: HTMLElement | null = null;
    private leaderboardTitle: HTMLElement | null = null;

    showGameOver() {
        if (this.gameOverMenu) {
            const nameEl = this.gameOverMenu.querySelector('#gameOverPlayerName');
            const scoreEl = this.gameOverMenu.querySelector('#gameOverScore');
            const bestScoreEl = this.gameOverMenu.querySelector('#gameOverBestScore');

            if (nameEl) nameEl.textContent = `Player: ${this.game.playerName}`;
            if (scoreEl) scoreEl.textContent = `Score: ${this.game.score}`;

            const scores = this.game.leaderboard.getTopScores(this.game.mode);
            const best = scores.length > 0 ? scores[0].score : this.game.score;
            if (bestScoreEl) bestScoreEl.textContent = `Best: ${best}`;

            this.gameOverMenu.style.display = 'flex';
        }
        if (this.pauseBtn) this.pauseBtn.style.display = 'none';
    }

    hideGameOver() {
        if (this.gameOverMenu) {
            this.gameOverMenu.style.display = 'none';
        }
        this.updatePauseBtnText();
        if (this.homeMenu && this.homeMenu.style.display === 'none') {
            if (this.pauseBtn) this.pauseBtn.style.display = 'block';
        }
    }

    private createLeaderboardOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'leaderboardOverlay';
        overlay.style.display = 'none';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '3000';
        overlay.style.color = 'white';

        this.leaderboardTitle = document.createElement('h2');
        this.leaderboardTitle.style.marginBottom = '20px';
        overlay.appendChild(this.leaderboardTitle);

        this.leaderboardList = document.createElement('div');
        this.leaderboardList.style.width = '80%';
        this.leaderboardList.style.maxHeight = '60%';
        this.leaderboardList.style.overflowY = 'auto';
        this.leaderboardList.style.display = 'flex';
        this.leaderboardList.style.flexDirection = 'column';
        this.leaderboardList.style.gap = '10px';
        this.leaderboardList.style.touchAction = 'pan-y'; // Allow vertical scrolling on mobile
        overlay.appendChild(this.leaderboardList);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.className = 'menu-btn';
        closeBtn.style.marginTop = '20px';
        closeBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
        });
        overlay.appendChild(closeBtn);

        this.root.appendChild(overlay);
        this.leaderboardOverlay = overlay;
    }

    async showLeaderboard() {
        if (!this.leaderboardOverlay || !this.leaderboardList || !this.leaderboardTitle) return;

        this.leaderboardOverlay.style.display = 'flex';
        this.leaderboardList.innerHTML = '<p>Loading...</p>';

        const modeName = this.game.mode === GameMode.SPECIAL ? 'Special' : 'Normal';
        if (this.leaderboardTitle) this.leaderboardTitle.textContent = `Leaderboard (${modeName})`;

        const localScores = this.game.leaderboard.getTopScores(this.game.mode);
        const onlineScores = await this.game.leaderboard.getOnlineScores(this.game.mode);

        this.leaderboardList.innerHTML = '';

        const createSection = (title: string, scores: any[]) => {
            const section = document.createElement('div');
            section.style.marginBottom = '20px';
            section.innerHTML = `<h3>${title}</h3>`;
            if (scores.length === 0) {
                section.innerHTML += '<p style="color: #aaa">No scores yet.</p>';
            } else {
                scores.forEach((s, i) => {
                    const row = document.createElement('div');
                    row.style.background = 'rgba(255,255,255,0.1)';
                    row.style.padding = '5px 10px';
                    row.style.borderRadius = '4px';
                    row.textContent = `#${i + 1} ${s.name}: ${s.score}`;
                    section.appendChild(row);
                });
            }
            return section;
        };

        this.leaderboardList.appendChild(createSection('Your Best (Local)', localScores));
        this.leaderboardList.appendChild(createSection('World Top 10 (Online)', onlineScores));
    }

    startGame(mode?: GameMode) {
        if (this.homeMenu) this.homeMenu.style.display = 'none';
        if (this.leaderboardOverlay) this.leaderboardOverlay.style.display = 'none';
        if (this.pauseBtn) this.pauseBtn.style.display = 'block';
        const modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (modeDisplay) modeDisplay.style.display = 'block';

        this.hideGameOver();

        if (mode) {
            this.game.mode = mode;
            this.game.start(false);
        } else {
            this.game.mode = GameMode.OFFLINE;
            this.game.start(false);
        }

        this.updateModeDisplay();
        this.updatePauseBtnText();
        this.updateStats();
    }

    showHome() {
        if (this.homeMenu) this.homeMenu.style.display = 'flex';
        if (this.pauseBtn) this.pauseBtn.style.display = 'none';
        const modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (modeDisplay) modeDisplay.style.display = 'none';
        this.game.isPaused = true;
        this.game.saveState();
    }

    promptRename() {
        const newName = prompt('Enter your name:', this.game.playerName);
        if (newName && newName.trim().length > 0) {
            this.game.setPlayerName(newName.trim());
            alert(`Name changed to: ${this.game.playerName}`);
            this.updateModeDisplay();
        }
    }

    updateModeDisplay() {
        const modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (modeDisplay) {
            const modeText = this.game.mode === GameMode.SPECIAL ? 'Special' : 'Normal';
            modeDisplay.textContent = `Player: ${this.game.playerName} | Mode: ${modeText}`;

            if (!import.meta.env.PROD) {
                const br = document.createElement('br');
                modeDisplay.appendChild(br);

                const span = document.createElement('span');
                span.style.fontSize = '0.8em';
                span.style.color = '#888';

                const d = new Date(COMMIT_DATE);
                const dateStr = isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleString();
                const now = new Date().toLocaleString();
                const cleanHash = String(COMMIT_HASH).trim();
                const dateDisplay = cleanHash === 'now' ? now : dateStr;

                const hashDisplay = cleanHash === 'now' ? 'Dev Changes (HMR)' : cleanHash;
                span.textContent = `v${APP_VERSION} (${hashDisplay}) - ${dateDisplay}`;

                modeDisplay.appendChild(span);
            }
        }
    }

    toggleMenu() {
        if (this.game.isPaused) {
            this.game.togglePause();
            this.hideMenu();
        } else {
            this.game.togglePause();
            this.game.saveState();
            this.showMenu();
        }
    }

    showMenu() {
        if (this.menu) this.menu.style.display = 'flex';
        this.updatePauseBtnText();
    }

    hideMenu() {
        if (this.menu) this.menu.style.display = 'none';
        this.updatePauseBtnText();
    }

    showCoopMenu() {
        // Create Coop Menu Overlay
        const coopMenu = document.createElement('div');
        coopMenu.id = 'coopMenu';
        coopMenu.style.position = 'absolute';
        coopMenu.style.top = '0';
        coopMenu.style.left = '0';
        coopMenu.style.width = '100%';
        coopMenu.style.height = '100%';
        coopMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        coopMenu.style.display = 'flex';
        coopMenu.style.flexDirection = 'column';
        coopMenu.style.alignItems = 'center';
        coopMenu.style.justifyContent = 'center';
        coopMenu.style.zIndex = '2000';
        coopMenu.style.color = 'white';

        const title = document.createElement('h2');
        title.textContent = '🎮 Cooperative Mode';
        title.style.marginBottom = '2rem';
        coopMenu.appendChild(title);

        const description = document.createElement('p');
        description.textContent = 'Play together on a shared 24x12 board!';
        description.style.marginBottom = '2rem';
        description.style.color = '#aaa';
        coopMenu.appendChild(description);

        // Create Room Button
        const createRoomBtn = document.createElement('button');
        createRoomBtn.textContent = 'Create Room';
        createRoomBtn.className = 'menu-btn';
        createRoomBtn.style.marginBottom = '1rem';
        createRoomBtn.addEventListener('click', () => {
            this.createCoopRoom();
            this.root.removeChild(coopMenu);
        });
        coopMenu.appendChild(createRoomBtn);

        // Join Room Button
        const joinRoomBtn = document.createElement('button');
        joinRoomBtn.textContent = 'Join Room';
        joinRoomBtn.className = 'menu-btn';
        joinRoomBtn.style.marginBottom = '1rem';
        joinRoomBtn.addEventListener('click', async () => {
            const roomId = prompt('Enter Room ID:');
            if (roomId && roomId.trim()) {
                try {
                    // Remove menu first to show loading state
                    this.root.removeChild(coopMenu);
                    await this.joinCoopRoom(roomId.trim());
                } catch (error) {
                    console.error('[Coop] Join failed:', error);
                    // Re-show menu if join failed
                    this.showCoopMenu();
                }
            }
        });
        coopMenu.appendChild(joinRoomBtn);

        // Back Button
        const backBtn = document.createElement('button');
        backBtn.textContent = 'Back';
        backBtn.className = 'menu-btn';
        backBtn.addEventListener('click', () => {
            this.root.removeChild(coopMenu);
        });
        coopMenu.appendChild(backBtn);

        this.root.appendChild(coopMenu);
    }

    private async createCoopRoom() {
        try {
            const { RoomManager } = await import('../coop/RoomManager');
            const roomManager = new RoomManager();

            // Get player ID (use auth or generate guest ID)
            const playerId = this.authService.getAuth()?.currentUser?.uid ||
                `guest_${Math.random().toString(36).substring(2, 10)}`;

            const room = await roomManager.createRoom(playerId);

            // Show Room ID with Copy button
            this.showRoomIdModal(room.id, () => {
                // Start game when user clicks "Start Game"
                this.startCoopGame(room, 1);
            });
        } catch (error) {
            console.error('[Coop] Failed to create room:', error);
            alert('Failed to create room. Make sure Firebase Realtime Database is configured.');
        }
    }

    private async joinCoopRoom(roomId: string) {
        console.log('[Coop] Attempting to join room:', roomId);
        try {
            const { RoomManager } = await import('../coop/RoomManager');
            const roomManager = new RoomManager();

            const playerId = this.authService.getAuth()?.currentUser?.uid ||
                `guest_${Math.random().toString(36).substring(2, 10)}`;

            console.log('[Coop] Player ID:', playerId);

            const room = await roomManager.joinRoom(roomId, playerId);
            console.log('[Coop] Join result:', room);

            if (room) {
                console.log('[Coop] Successfully joined room:', room.id);
                // Start Coop Game as Player 2
                await this.startCoopGame(room, 2);
            } else {
                console.error('[Coop] Room not found:', roomId);
                alert(`Room not found!\nRoom ID: ${roomId}\n\nPlease check the Room ID and try again.`);
                throw new Error('Room not found');
            }
        } catch (error) {
            console.error('[Coop] Failed to join room:', error);
            alert(`Failed to join room.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check:\n- Room ID is correct\n- Firebase Realtime Database is configured`);
            throw error;
        }
    }

    private showRoomIdModal(roomId: string, onStartGame: () => void) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'roomIdModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '3000';
        modal.style.color = 'white';

        // Title
        const title = document.createElement('h2');
        title.textContent = '🎉 Room Created!';
        title.style.marginBottom = '1rem';
        title.style.fontSize = '2rem';
        modal.appendChild(title);

        // Description
        const desc = document.createElement('p');
        desc.textContent = 'Share this Room ID with your friend:';
        desc.style.marginBottom = '1rem';
        desc.style.color = '#aaa';
        modal.appendChild(desc);

        // Room ID Container
        const roomIdContainer = document.createElement('div');
        roomIdContainer.style.display = 'flex';
        roomIdContainer.style.alignItems = 'center';
        roomIdContainer.style.gap = '1rem';
        roomIdContainer.style.marginBottom = '2rem';
        roomIdContainer.style.padding = '1rem 2rem';
        roomIdContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        roomIdContainer.style.borderRadius = '8px';

        // Room ID Text
        const roomIdText = document.createElement('span');
        roomIdText.textContent = roomId;
        roomIdText.style.fontSize = '1.5rem';
        roomIdText.style.fontWeight = 'bold';
        roomIdText.style.fontFamily = 'monospace';
        roomIdText.style.color = '#4DD0E1';
        roomIdText.style.userSelect = 'all';
        roomIdContainer.appendChild(roomIdText);

        // Copy Button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copy';
        copyBtn.className = 'menu-btn';
        copyBtn.style.fontSize = '1rem';
        copyBtn.style.padding = '0.5rem 1rem';
        copyBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(roomId);
                copyBtn.textContent = '✓ Copied!';
                copyBtn.style.background = '#81C784';
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy';
                    copyBtn.style.background = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                // Fallback: select text
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(roomIdText);
                selection?.removeAllRanges();
                selection?.addRange(range);
                copyBtn.textContent = '✓ Selected!';
            }
        });
        roomIdContainer.appendChild(copyBtn);

        modal.appendChild(roomIdContainer);

        // Instructions
        const instructions = document.createElement('p');
        instructions.textContent = 'Waiting for Player 2 to join...';
        instructions.style.marginBottom = '2rem';
        instructions.style.color = '#FFB74D';
        instructions.style.fontSize = '0.9rem';
        modal.appendChild(instructions);

        // Start Game Button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Game';
        startBtn.className = 'menu-btn';
        startBtn.style.fontSize = '1.5rem';
        startBtn.style.padding = '1rem 3rem';
        startBtn.style.background = 'linear-gradient(45deg, #4DD0E1 0%, #81C784 100%)';
        startBtn.addEventListener('click', () => {
            this.root.removeChild(modal);
            onStartGame();
        });
        modal.appendChild(startBtn);

        // Cancel Button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'menu-btn';
        cancelBtn.style.marginTop = '1rem';
        cancelBtn.style.fontSize = '1rem';
        cancelBtn.addEventListener('click', () => {
            this.root.removeChild(modal);
        });
        modal.appendChild(cancelBtn);

        this.root.appendChild(modal);
    }

    private async startCoopGame(room: RoomInfo, playerNumber: 1 | 2) {
        try {
            // Dynamic imports
            const [
                { CoopGame },
                { CoopRenderer },
                { CoopInputHandler }
            ] = await Promise.all([
                import('../coop/CoopGame'),
                import('./CoopRenderer'),
                import('../coop/CoopInputHandler')
            ]);

            // Hide home menu
            if (this.homeMenu) this.homeMenu.style.display = 'none';

            // Hide solo game elements (canvas and panels)
            const soloCanvas = this.root.querySelector<HTMLCanvasElement>('#gameCanvas');
            const gameContainer = this.root.querySelector<HTMLElement>('#game-container');
            const leftPanel = this.root.querySelector<HTMLElement>('#left-panel');
            const rightPanel = this.root.querySelector<HTMLElement>('#right-panel');

            if (soloCanvas) soloCanvas.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'none';
            if (leftPanel) leftPanel.style.display = 'none';
            if (rightPanel) rightPanel.style.display = 'none';

            // Create or get coop canvas
            let canvas = this.root.querySelector<HTMLCanvasElement>('#coopCanvas');
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = 'coopCanvas';
                canvas.width = 24 * 30; // 24 columns * 30px
                canvas.height = 12 * 30; // 12 rows * 30px
                canvas.style.display = 'block';
                canvas.style.margin = '2rem auto';
                canvas.style.border = '2px solid #4DD0E1';
                canvas.style.borderRadius = '8px';
                canvas.style.boxShadow = '0 4px 20px rgba(77, 208, 225, 0.3)';
                this.root.appendChild(canvas);
            } else {
                canvas.style.display = 'block';
            }

            // Initialize Coop components
            this.coopGame = new CoopGame();
            this.coopRenderer = new CoopRenderer(canvas, 30);
            this.coopInputHandler = new CoopInputHandler();

            // Setup input handling
            const keyHandler = (e: KeyboardEvent) => {
                const input = this.coopInputHandler?.handleInput(e);
                if (input && this.coopGame) {
                    this.coopGame.handleInput(input.action);
                    e.preventDefault();
                }
            };
            document.addEventListener('keydown', keyHandler);

            // Start game
            this.coopGame.start(room, playerNumber);

            // Render loop
            const renderLoop = () => {
                if (this.coopGame && this.coopRenderer) {
                    const state = this.coopGame.getState();
                    this.coopRenderer.render(
                        state.board,
                        state.player1,
                        state.player2,
                        state.isPaused
                    );

                    // Update stats
                    if (this.scoreVal) this.scoreVal.textContent = state.score.toString();
                    if (this.linesVal) this.linesVal.textContent = state.lines.toString();
                    if (this.levelVal) this.levelVal.textContent = state.level.toString();

                    if (!state.gameOver) {
                        requestAnimationFrame(renderLoop);
                    }
                }
            };
            renderLoop();

            console.log(`[Coop] Game started as Player ${playerNumber}`);
        } catch (error) {
            console.error('[Coop] Failed to start game:', error);
            alert('Failed to start Coop game.');
        }
    }

    updatePauseBtnText() {
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.game.isPaused ? 'Resume' : 'Pause';
        }
    }
}
