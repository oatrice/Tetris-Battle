import { Board } from './Board';
import { Tetromino } from './Tetromino';
import { GameAction } from './InputHandler';

export class Game {
    board: Board;
    currentPiece: Tetromino | null;
    position: { x: number, y: number };

    constructor() {
        this.board = new Board();
        this.currentPiece = null;
        this.position = { x: 0, y: 0 };
    }

    gameOver: boolean = false;
    nextPiece: Tetromino | null = null;
    score: number = 0;
    lines: number = 0;
    level: number = 1;
    private dropTimer: number = 0;
    private dropInterval: number = 1000; // 1 second

    isPaused: boolean = false;

    start(): void {
        this.gameOver = false;
        this.isPaused = false;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.board = new Board(this.board.width, this.board.height); // Reset board
        this.nextPiece = this.generatePiece(); // Pre-generate
        this.spawnPiece();
    }

    restart(): void {
        this.start();
    }

    togglePause(): void {
        if (!this.gameOver) {
            this.isPaused = !this.isPaused;
        }
    }

    update(deltaTime: number): void {
        if (this.gameOver || this.isPaused) return;

        this.dropTimer += deltaTime;
        if (this.dropTimer > this.dropInterval) {
            this.moveDown();
            this.dropTimer = 0;
        }
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
            this.currentPiece = null; // Clean up
        }
    }

    private moveDown(): void {
        if (this.currentPiece) {
            if (this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y + 1)) {
                this.position.y += 1;
            } else {
                // Lock piece
                this.board.lockPiece(this.currentPiece, this.position.x, this.position.y);

                const cleared = this.board.clearLines();
                if (cleared > 0) {
                    this.lines += cleared;
                    this.score += cleared * 100;
                    // Level up logic (every 10 lines)
                    this.level = Math.floor(this.lines / 10) + 1;
                    // Speed up?
                    this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
                }
                this.spawnPiece();
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
        }
    }
}
