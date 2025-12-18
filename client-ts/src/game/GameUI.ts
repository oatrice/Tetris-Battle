import { Game } from './Game';
import { GameMode } from './GameMode';
import { APP_VERSION, COMMIT_HASH, COMMIT_DATE } from 'virtual:version-info';
import { AuthService } from '../services/AuthService';

export class GameUI {
    private game: Game;
    private root: HTMLElement;
    private menu: HTMLElement | null = null;
    private homeMenu: HTMLElement | null = null;
    private pauseBtn: HTMLButtonElement | null = null;
    private authService: AuthService;
    private userProfile: HTMLElement | null = null;
    private loginBtn: HTMLButtonElement | null = null;

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

        // 1. Setup UI Elements Page
        this.createHomeMenu();

        // Listen to Auth State logic
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

        // 1. Setup Pause Button
        this.pauseBtn = this.root.querySelector('#pauseBtn');
        if (!this.pauseBtn) {
            this.pauseBtn = document.createElement('button');
            this.pauseBtn.id = 'pauseBtn';
            this.pauseBtn.textContent = 'Pause';
            this.pauseBtn.style.display = 'none'; // Initially hidden on home screen
            const controls = this.root.querySelector('.ui-controls');
            if (controls) {
                controls.appendChild(this.pauseBtn);
            } else {
                this.root.appendChild(this.pauseBtn);
            }
        } else {
            this.pauseBtn.style.display = 'none';
        }

        // 1.5 Setup Mode Display
        let modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (!modeDisplay) {
            modeDisplay = document.createElement('div');
            modeDisplay.id = 'modeDisplay';
            modeDisplay.style.marginTop = '0'; // Adjusted for placement
            modeDisplay.style.display = 'none'; // Initially hidden
            modeDisplay.style.marginBottom = '0.5rem';

            // Insert before the description paragraph (usually the last p element)
            const descriptionRef = this.root.querySelector('p');
            if (descriptionRef && descriptionRef.parentNode) {
                descriptionRef.parentNode.insertBefore(modeDisplay, descriptionRef);
            } else {
                this.root.appendChild(modeDisplay);
            }
        }
        this.updateModeDisplay();

        // 2. Create Pause Menu
        this.createPauseMenu();
        this.createGameOverMenu();
        this.createLeaderboardOverlay();

        // 3. Bind Events
        this.pauseBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMenu();
            this.pauseBtn?.blur();
        });
        // 4. Mobile Enhancements
        this.preventPullToRefresh();

        // 5. Auto Save/Restore on Focus/Blur
        this.setupAutoSave();
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
            if (window.scrollY === 0 && e.touches[0].clientY > 0 && e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    private createHomeMenu() {
        this.homeMenu = document.createElement('div');
        this.homeMenu.id = 'homeMenu';
        this.homeMenu.classList.add('home-menu');
        // Styles are now in style.css

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
        this.userProfile.style.display = 'none'; // Hidden by default
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

        // Logout Button (Small)
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.fontSize = '0.8rem';
        logoutBtn.style.padding = '5px 10px';
        logoutBtn.addEventListener('click', () => {
            this.authService.logout().catch(console.error);
        });
        this.userProfile.appendChild(logoutBtn);

        this.loginBtn = document.createElement('button');
        this.loginBtn.id = 'login-btn';
        this.loginBtn.textContent = 'Login with Google';
        this.loginBtn.className = 'menu-btn'; // Re-use style
        this.loginBtn.style.background = '#4285F4'; // Google Blue
        this.loginBtn.style.fontSize = '1rem';
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
            btn.className = 'menu-btn'; // For CSS styling
            btn.addEventListener('click', onClick);
            return btn;
        };

        const btnSolo = createBtn('btnSolo', 'Solo Mode (Normal)', () => {
            this.startGame();
        });

        const btnSpecial = createBtn('btnSpecial', 'Special Mode', () => {
            this.startGame(GameMode.SPECIAL);
        });

        const btnChangeName = createBtn('btnChangeName', 'Change Name', () => {
            this.promptRename();
        });

        const btnLeaderboard = createBtn('btnLeaderboard', 'Leaderboard', () => {
            this.showLeaderboard();
        });

        this.homeMenu.appendChild(btnSolo);
        this.homeMenu.appendChild(btnSpecial);
        this.homeMenu.appendChild(btnChangeName);
        this.homeMenu.appendChild(btnLeaderboard);

        const versionInfo = document.createElement('div');
        versionInfo.style.marginTop = '1rem';
        versionInfo.style.fontSize = '0.8rem';
        versionInfo.style.color = '#666';

        if (import.meta.env.PROD) {
            versionInfo.textContent = `v${APP_VERSION}`;
        } else {
            // In DEV, show build date/hash from Vite Config
            const dateStr = new Date(COMMIT_DATE).toLocaleString();
            const now = new Date().toLocaleString();
            const hashDisplay = COMMIT_HASH === 'now' ? 'Dev Changes (HMR)' : COMMIT_HASH;
            const datetime = COMMIT_HASH === 'now' ? now : dateStr;
            versionInfo.innerHTML = `v${APP_VERSION} (${hashDisplay})<br>Last Update: ${datetime}`;
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
                // Use placeholder if photoURL is missing
                const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iI2NjYyIvPjx0ZXh0IHg9IjIwIiB5PSIyNSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiPlU8L3RleHQ+PC9zdmc+';
                if (avatarEl) avatarEl.src = user.photoURL || defaultAvatar;

                this.game.setPlayerName(user.displayName || 'Player');
                this.game.setPlayerMetadata(user.uid, user.photoURL);

                // Merge anonymous scores
                this.game.leaderboard.mergeLocalScoresToUser(user.uid, user.photoURL);
            }
        } else {
            if (this.loginBtn) this.loginBtn.style.display = 'block';
            if (this.userProfile) this.userProfile.style.display = 'none';

            // Reset game player info on logout
            // We might want to revert to "Player" or load from LocalStorage if we supported that separately
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

        // Add Quit to Home
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
        menu.classList.add('game-over-menu'); // Re-use or add new class

        // Inline styles for now to match Pause Menu usually, or use CSS class
        // Making it overlay
        menu.style.position = 'absolute';
        menu.style.top = '0';
        menu.style.left = '0';
        menu.style.width = '100%';
        menu.style.height = '100%';
        menu.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        menu.style.flexDirection = 'column';
        menu.style.justifyContent = 'center';
        menu.style.alignItems = 'center';
        menu.style.zIndex = '100'; // above everything

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
        restartBtn.className = 'menu-btn'; // Use shared class
        restartBtn.style.fontSize = '1.5rem';
        restartBtn.style.padding = '15px 40px';
        restartBtn.style.border = 'none';
        restartBtn.style.borderRadius = '50px';
        restartBtn.style.background = 'linear-gradient(45deg, #FF512F 0%, #DD2476 100%)';
        restartBtn.style.color = 'white';
        restartBtn.style.cursor = 'pointer';
        restartBtn.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        restartBtn.style.transition = 'transform 0.2s, box-shadow 0.2s';

        // Add simple hover effect via JS since inline
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
        // Since restart shows pause button handled in startGame usually, checking display is tricky
        // Logic: if not home menu, should show pause button
        if (this.homeMenu && this.homeMenu.style.display === 'none') {
            if (this.pauseBtn) this.pauseBtn.style.display = 'block';
        }
    }

    private leaderboardOverlay: HTMLElement | null = null;
    private leaderboardList: HTMLElement | null = null;
    private leaderboardTitle: HTMLElement | null = null;

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
        overlay.style.zIndex = '3000'; // Must be higher than HomeMenu (2000)
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

        // Fetch Data
        const localScores = this.game.leaderboard.getTopScores(this.game.mode);
        const onlineScores = await this.game.leaderboard.getOnlineScores(this.game.mode);

        this.leaderboardList.innerHTML = '';

        // Render Local
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

        this.hideGameOver(); // Ensure overlay is gone

        if (mode) {
            this.game.mode = mode;
            this.game.start(false); // Changed from true to false: Try loading first
        } else {
            this.game.mode = GameMode.OFFLINE;
            this.game.start(false);
        }

        this.updateModeDisplay();
        this.updatePauseBtnText();
    }

    showHome() {
        if (this.homeMenu) this.homeMenu.style.display = 'flex';
        if (this.pauseBtn) this.pauseBtn.style.display = 'none';
        const modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (modeDisplay) modeDisplay.style.display = 'none';

        // Ensure game is paused or stopped? 
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

    // showLeaderboard replaced by async version above

    updateModeDisplay() {
        const modeDisplay = this.root.querySelector<HTMLElement>('#modeDisplay');
        if (modeDisplay) {
            console.log('[GameUI] Version Check:', { version: APP_VERSION, hash: COMMIT_HASH, date: COMMIT_DATE });
            const modeText = this.game.mode === GameMode.SPECIAL ? 'Special' : 'Normal';
            modeDisplay.textContent = `Player: ${this.game.playerName} | Mode: ${modeText}`;

            if (!import.meta.env.PROD) {
                const br = document.createElement('br');
                modeDisplay.appendChild(br);

                const span = document.createElement('span');
                span.style.fontSize = '0.8em';
                span.style.color = '#888';

                // Use the date provided by Vite Config (which is already "now" or "git timestamp")
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
            this.game.saveState(); // Save immediately when paused
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

    updatePauseBtnText() {
        if (this.pauseBtn) {
            this.pauseBtn.textContent = this.game.isPaused ? 'Resume' : 'Pause';
        }
    }
}
