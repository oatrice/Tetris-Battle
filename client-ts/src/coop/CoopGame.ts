/**
 * CoopGame.ts
 * Game controller for Cooperative Mode
 * Manages game state, dual pieces, and synchronization
 */

import { CoopBoard } from './CoopBoard';
import { DualPieceController, PlayerAction } from './DualPiece';
import { CoopSync } from './CoopSync';
import { RoomInfo } from './RoomManager';

export class CoopGame {
    board: CoopBoard;
    controller: DualPieceController;
    sync?: CoopSync;

    isPaused: boolean = false;
    gameOver: boolean = false;

    score: number = 0;
    lines: number = 0;
    level: number = 1;

    private lastUpdate: number = 0;
    private dropInterval: number = 1000; // 1 second
    private animationFrameId?: number;

    playerNumber: 1 | 2 = 1; // Which player this client controls
    room?: RoomInfo;

    constructor() {
        this.board = new CoopBoard();
        this.controller = new DualPieceController(this.board);
    }

    /**
     * Start the game with optional room for multiplayer sync
     */
    start(room?: RoomInfo, playerNumber: 1 | 2 = 1) {
        this.room = room;
        this.playerNumber = playerNumber;

        if (room && playerNumber === 2) {
            console.log('[CoopGame] Guest waiting for Host state...');
        } else {
            // Spawn initial pieces
            const spawned = this.controller.spawnPieces();
            if (!spawned) {
                console.error('[CoopGame] Cannot spawn initial pieces - Game Over immediately!');
                this.gameOver = true;
                return; // Don't start game loop
            }
        }

        // Start game loop
        this.isPaused = false;
        this.gameOver = false;
        this.lastUpdate = performance.now();
        this.gameLoop();

        // Setup sync if room provided
        if (room) {
            this.setupSync(room, playerNumber);
        }
    }

    private setupSync(room: RoomInfo, playerNumber: 1 | 2) {
        this.sync = new CoopSync();
        this.sync.start(room, this, playerNumber);
        console.log(`[CoopGame] Sync enabled for Player ${playerNumber}`);
    }

    /**
     * Main game loop
     */
    private gameLoop = () => {
        if (this.gameOver) return;

        const now = performance.now();
        const delta = now - this.lastUpdate;

        if (!this.isPaused) {
            this.update(delta);
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    };

    /**
     * Update game state
     */
    update(delta: number) {
        if (this.gameOver) return; // Stop updating if game over

        // Apply gravity every dropInterval
        if (delta >= this.dropInterval) {
            const gravityResult = this.controller.applyGravity();
            this.lastUpdate = performance.now();

            // Check if any piece needs respawn (locked)
            if (gravityResult.player1Locked || gravityResult.player2Locked) {
                // Try to spawn new pieces
                if (gravityResult.player1Locked) {
                    const spawned = this.controller.spawnPiece(1);
                    if (!spawned) {
                        console.log('[CoopGame] Player 1 cannot spawn - Game Over!');
                        this.gameOver = true;
                        return;
                    }
                }
                if (gravityResult.player2Locked) {
                    const spawned = this.controller.spawnPiece(2);
                    if (!spawned) {
                        console.log('[CoopGame] Player 2 cannot spawn - Game Over!');
                        this.gameOver = true;
                        return;
                    }
                }

                // Master (Player 1) broadcasts authoritative snapshot on any lock event
                // This ensures all clients have exact same board and next pieces
                if (this.playerNumber === 1 && this.sync) {
                    this.sync.sendLockSnapshot();
                }
            }

            // Check for line clears
            const result = this.controller.checkAndClearLines();
            if (result.linesCleared > 0) {
                this.lines += result.linesCleared;
                this.score += this.calculateScore(result.linesCleared);
                this.updateLevel();
            }
        }
    }

    /**
     * Handle player input
     */
    handleInput(action: PlayerAction) {
        if (this.isPaused || this.gameOver) return;
        this.controller.handleAction(this.playerNumber, action);
    }

    /**
     * Calculate score based on lines cleared
     */
    private calculateScore(linesCleared: number): number {
        const baseScores = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
        return (baseScores[linesCleared] || 0) * this.level;
    }

    /**
     * Update level based on lines cleared
     */
    private updateLevel() {
        const newLevel = Math.floor(this.lines / 10) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 50);
        }
    }

    /**
     * Toggle pause
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastUpdate = performance.now();
        }
    }

    /**
     * Restart the game
     */
    restart() {
        this.board = new CoopBoard();
        this.controller = new DualPieceController(this.board);
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.isPaused = false;

        this.start(this.room, this.playerNumber);
    }

    /**
     * Stop the game
     */
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.sync) {
            this.sync.stop();
        }
    }

    /**
     * Get current state for rendering
     */
    getState() {
        return {
            board: this.board,
            player1: {
                piece: this.controller.getPiece(1),
                position: this.controller.getPosition(1)
            },
            player2: {
                piece: this.controller.getPiece(2),
                position: this.controller.getPosition(2)
            },
            nextPieces: {
                player1: this.controller.getNextPiece(1),
                player2: this.controller.getNextPiece(2)
            },
            score: this.score,
            lines: this.lines,
            level: this.level,
            isPaused: this.isPaused,
            gameOver: this.gameOver
        };
    }
}
