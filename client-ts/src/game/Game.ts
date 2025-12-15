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
    private dropTimer: number = 0;
    private dropInterval: number = 1000; // 1 second

    start(): void {
        this.gameOver = false;
        this.nextPiece = this.generatePiece(); // Pre-generate
        this.spawnPiece();
    }

    update(deltaTime: number): void {
        if (this.gameOver) return;

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

                // Clear lines
                this.board.clearLines();

                // Spawn next
                this.spawnPiece();
            }
        }
    }

    handleAction(action: GameAction | string): void {
        if (!this.currentPiece) return;

        switch (action) {
            case GameAction.MOVE_LEFT:
            case 'MOVE_LEFT':
                if (this.board.isValidPosition(this.currentPiece, this.position.x - 1, this.position.y)) {
                    this.position.x -= 1;
                }
                break;
            case GameAction.MOVE_RIGHT:
            case 'MOVE_RIGHT':
                if (this.board.isValidPosition(this.currentPiece, this.position.x + 1, this.position.y)) {
                    this.position.x += 1;
                }
                break;
            case GameAction.ROTATE_CW:
            case 'ROTATE_CW':
                this.currentPiece.rotate();
                if (!this.board.isValidPosition(this.currentPiece, this.position.x, this.position.y)) {
                    // Wall kick (basic: try moving left/right)
                    // For now, simplify: if invalid, rotate back
                    // To rotate back we need separate logic or 3 more rotates.
                    // Let's assume naive rotation first: just revert manual deep copy or re-rotate 3 times?
                    // Since Tetromino.rotate() mutates, we need to revert it.
                    // Or clone before rotate.
                    // Simple revert: rotate 3 times (270 deg)
                    this.currentPiece.rotate();
                    this.currentPiece.rotate();
                    this.currentPiece.rotate();
                }
                break;
            case GameAction.SOFT_DROP:
            case 'SOFT_DROP':
                this.moveDown();
                // Reset timer if moved by user? Optional design choice.
                break;
        }
    }
}
