import { Board } from './Board';
import { Tetromino, TetrominoType } from './Tetromino';
import { GameAction } from './InputHandler';
import { GameMode } from './GameMode';
import { Leaderboard } from './Leaderboard';

export interface Effect {
    type: 'LINE_CLEAR';
    y: number;
    timeLeft: number;
    color: string;
}


const INITIAL_DROP_INTERVAL = 1000;
const MIN_DROP_INTERVAL = 100;
const SAVE_STATE_KEY = 'tetris_state';

interface GameState {
    score: number;
    lines: number;
    level: number;
    board: number[][];
    currentPiece: {
        type: TetrominoType;
        shape: number[][];
    } | null;
    nextPiece: {
        type: TetrominoType;
        shape: number[][];
    } | null;
    position: { x: number, y: number };
    playerName: string;
    ghostPieceEnabled: boolean;
    gameOver: boolean;
    isPaused: boolean;
}

export class Game {
    board: Board;
    currentPiece: Tetromino | null;
    position: { x: number, y: number };
    effects: Effect[] = [];
    leaderboard: Leaderboard;
    playerName: string = 'Player';

    constructor(mode: GameMode = GameMode.OFFLINE) {
        this.mode = mode;
        this.board = new Board();
        this.currentPiece = null;
        this.position = { x: 0, y: 0 };
        this.leaderboard = new Leaderboard();
    }

    mode: GameMode = GameMode.OFFLINE;

    get isOffline(): boolean {
        return this.mode === GameMode.OFFLINE;
    }

    setPlayerName(name: string): void {
        this.playerName = name;
    }

    gameOver: boolean = false;
    nextPiece: Tetromino | null = null;
    score: number = 0;
    lines: number = 0;
    level: number = 1;
    private dropTimer: number = 0;
    private dropInterval: number = INITIAL_DROP_INTERVAL; // 1 second

    isPaused: boolean = false;
    ghostPieceEnabled: boolean = true;

    start(forceReset: boolean = false): void {
        if (!forceReset && this.loadState()) {
            return;
        }

        this.gameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = INITIAL_DROP_INTERVAL;
        this.dropTimer = 0;
        this.board = new Board(this.board.width, this.board.height); // Reset board
        this.nextPiece = this.generatePiece(); // Pre-generate
        this.spawnPiece();
    }

    restart(): void {
        this.start(true);
    }

    togglePause(): void {
        if (!this.gameOver) {
            this.isPaused = !this.isPaused;
        }
    }

    toggleGhostPiece(): void {
        this.ghostPieceEnabled = !this.ghostPieceEnabled;
    }

    update(deltaTime: number): void {
        if (this.gameOver || this.isPaused) return;

        this.dropTimer += deltaTime;
        if (this.dropTimer > this.dropInterval) {
            this.moveDown();
            this.dropTimer = 0;
        }

        // Update effects
        this.effects = this.effects.filter(e => {
            e.timeLeft -= deltaTime;
            return e.timeLeft > 0;
        });
    }

    private generatePiece(): Tetromino {
        const types: any[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        const type = types[Math.floor(Math.random() * types.length)];
        return new Tetromino(type);
    }

    private spawnPiece(): void {
        if (!this.nextPiece) {
            this.nextPiece = this.generatePiece();
        }

        this.currentPiece = this.nextPiece;
        this.nextPiece = this.generatePiece();

        // Center the piece
        this.position = {
            x: Math.floor((this.board.width - this.currentPiece.shape[0].length) / 2),
            y: 0
        };

        // Check collision immediately
        if (!this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y)) {
            this.gameOver = true;
            this.leaderboard.addScore(this.playerName, this.score);
            this.currentPiece = null; // Clean up
        }
        // this.saveState(); // Removed per user request
    }

    private moveDown(): void {
        if (this.currentPiece) {
            if (this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y + 1)) {
                this.position.y += 1;
            } else {
                // Lock piece
                this.board.lockPiece(this.currentPiece, this.position.x, this.position.y);

                const { count, indices } = this.board.clearLines();
                if (count > 0) {
                    this.lines += count;
                    this.score += count * 100;

                    // Select color based on number of lines cleared
                    let effectColor = '#ffffff'; // Default white
                    switch (count) {
                        case 1: effectColor = '#00f0f0'; break; // Cyan (Single)
                        case 2: effectColor = '#00f000'; break; // Green (Double)
                        case 3: effectColor = '#f0a000'; break; // Orange (Triple)
                        case 4: effectColor = '#f0f000'; break; // Yellow (Tetris)
                    }

                    // Add effects
                    indices.forEach(y => {
                        this.effects.push({
                            type: 'LINE_CLEAR',
                            y: y,
                            timeLeft: 500, // 500ms effect
                            color: effectColor
                        });
                    });

                    // Level up logic (every 10 lines)
                    this.level = Math.floor(this.lines / 10) + 1;
                    // Speed up?
                    this.dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (this.level - 1) * 100);
                }
                this.spawnPiece();
            }
            if (this.currentPiece) { // Only save if move was successful/processed
                // this.saveState(); // Removed per user request
            }
        }
    }

    handleAction(action: GameAction): void {
        if (action === GameAction.RESTART) {
            this.restart();
            return;
        }

        if (action === GameAction.PAUSE) {
            this.togglePause();
            return;
        }

        if (this.gameOver || this.isPaused || !this.currentPiece) return;

        switch (action) {
            case GameAction.MOVE_LEFT:
                if (this.board.isValidPosition(this.currentPiece, this.position.x - 1, this.position.y)) {
                    this.position.x--;
                }
                break;
            case GameAction.MOVE_RIGHT:
                if (this.board.isValidPosition(this.currentPiece, this.position.x + 1, this.position.y)) {
                    this.position.x++;
                }
                break;
            case GameAction.ROTATE_CW:
                this.currentPiece.rotate();
                if (!this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y)) {
                    // Revert by rotating 3 times (270 degrees)
                    this.currentPiece.rotate();
                    this.currentPiece.rotate();
                    this.currentPiece.rotate();
                }
                break;
            case GameAction.SOFT_DROP:
                this.moveDown();
                this.score += 1; // Bonus for soft drop
                break;
            case GameAction.HARD_DROP:
                while (this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y + 1)) {
                    this.position.y++;
                    this.score += 2; // Bonus for hard drop
                }
                this.moveDown(); // Triggers lock
                break;
        }
        // this.saveState(); // Removed per user request
    }

    saveState(): void {
        if (this.gameOver) {
            localStorage.removeItem(SAVE_STATE_KEY);
            return;
        }

        const state: GameState = {
            score: this.score,
            lines: this.lines,
            level: this.level,
            board: this.board.grid,
            currentPiece: this.currentPiece ? {
                type: this.currentPiece.type,
                shape: this.currentPiece.shape
            } : null,
            nextPiece: this.nextPiece ? {
                type: this.nextPiece.type,
                shape: this.nextPiece.shape
            } : null,
            position: this.position,
            playerName: this.playerName,
            ghostPieceEnabled: this.ghostPieceEnabled,
            gameOver: this.gameOver,
            isPaused: this.isPaused
        };

        localStorage.setItem(SAVE_STATE_KEY, JSON.stringify(state));
    }

    loadState(): boolean {
        const savedJson = localStorage.getItem(SAVE_STATE_KEY);
        if (!savedJson) return false;

        try {
            const state: GameState = JSON.parse(savedJson);

            this.score = state.score;
            this.lines = state.lines;
            this.level = state.level;

            // Restore Board
            if (state.board) {
                this.board = new Board(this.board.width, this.board.height);
                // Deep copy grid to ensure no ref issues, though assignment is probably fine for POJO
                this.board.grid = state.board.map(row => [...row]);
            }

            // Restore Pieces
            if (state.currentPiece) {
                this.currentPiece = new Tetromino(state.currentPiece.type);
                this.currentPiece.setShape(state.currentPiece.shape);
            } else {
                this.currentPiece = null;
            }

            if (state.nextPiece) {
                this.nextPiece = new Tetromino(state.nextPiece.type);
                this.nextPiece.setShape(state.nextPiece.shape);
            } else {
                this.nextPiece = null;
            }

            this.position = state.position || { x: 0, y: 0 };
            this.playerName = state.playerName || 'Player';
            this.ghostPieceEnabled = state.ghostPieceEnabled !== undefined ? state.ghostPieceEnabled : true;
            this.gameOver = state.gameOver || false;
            this.isPaused = state.isPaused || false;

            // Recalculate speed based on level
            this.dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (this.level - 1) * 100);

            return true;
        } catch (e) {
            console.error('Failed to load state', e);
            return false;
        }
    }
    getGhostPosition(): { x: number, y: number } {
        if (!this.currentPiece) return { x: 0, y: 0 };

        let ghostY = this.position.y;
        while (this.board.isValidPosition(this.currentPiece, this.position.x, ghostY + 1)) {
            ghostY++;
        }

        return { x: this.position.x, y: ghostY };
    }
}
