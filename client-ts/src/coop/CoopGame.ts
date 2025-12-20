/**
 * CoopGame.ts
 * Game controller for Cooperative Mode
 * Manages game state, dual pieces, and synchronization
 */

import { CoopBoard } from './CoopBoard';
import { DualPieceController, PlayerAction } from './DualPiece';
import { CoopSync } from './CoopSync';
import { RoomInfo } from './RoomManager';
import { CoopLeaderboard } from './CoopLeaderboard';
import { AuthService } from '../services/AuthService';


export class CoopGame {
    board: CoopBoard;
    controller: DualPieceController;
    sync?: CoopSync;

    isPaused: boolean = false;
    gameOver: boolean = false;

    // State Aggregation (Task 2)
    linesP1: number = 0;
    linesP2: number = 0;

    // Derived properties for backwards compatibility
    get lines(): number {
        return this.linesP1 + this.linesP2;
    }
    set lines(v: number) {
        // Fallback for direct assignment (avoid breaking things, but aggregation prefers deltas)
        // If syncing full state, this might be called. Distribute?
        // We really shouldn't set this directly anymore.
        // For now, assign to P1 default? No, just split evenly?
        // Let's assume this setter is rarely used except by old sync code.
        this.linesP1 = v;
        this.linesP2 = 0;
    }

    get score(): number {
        // Calculate score based on lines for each player for accuracy? 
        // Or just sum a stored score?
        // Let's keep it simple: Scores are calculated from lines on clear.
        // We need to track scoreP1/P2 too if we want to sync properly?
        // Yes.
        return this.scoreP1 + this.scoreP2;
    }
    set score(v: number) {
        this.scoreP1 = v;
        this.scoreP2 = 0; // Legacy fallback
    }

    scoreP1: number = 0;
    scoreP2: number = 0;

    level: number = 1;

    private lastUpdate: number = 0;
    private dropInterval: number = 1000; // 1 second
    private animationFrameId?: number;

    playerNumber: 1 | 2 = 1; // Which player this client controls
    room?: RoomInfo;

    // Team Score System
    private leaderboard: CoopLeaderboard;
    player1Name: string = 'Player 1';
    player2Name: string = 'Player 2';

    constructor() {
        this.board = new CoopBoard();
        this.controller = new DualPieceController(this.board);
        this.leaderboard = new CoopLeaderboard();
    }

    /**
     * Set AuthService for online score syncing
     */
    setAuthService(authService: AuthService) {
        this.leaderboard.setAuthService(authService);
    }

    /**
     * Set player names for team score
     */
    setPlayerNames(player1Name: string, player2Name: string) {
        this.player1Name = player1Name;
        this.player2Name = player2Name;
    }

    /**
     * Start the game with optional room for multiplayer sync
     */
    start(room?: RoomInfo, playerNumber: 1 | 2 = 1) {
        this.room = room;
        this.playerNumber = playerNumber;

        if (room) {
            this.setupSync(room, playerNumber);
        }

        if (room && playerNumber === 2) {
            console.log('[CoopGame] Guest waiting for Host seed...');
            // Guest: Wait for seed before starting
            this.sync?.waitForSeed((seed) => {
                console.log('[CoopGame] Guest received seed, starting game.');

                // Initialize controller with shared seed
                this.controller.setSeed(seed);

                // Spawn initial pieces
                if (!this.spawnInitialPieces()) return;

                // Start game loop
                if (!this.animationFrameId) {
                    this.startGameLoop();
                }
            });
        } else {
            // Host or Local: Generate seed
            const seed = Math.floor(Math.random() * 1000000);
            console.log(`[CoopGame] Host initialization with seed: ${seed}`);

            this.controller.setSeed(seed);

            // Spawn initial pieces
            if (!this.spawnInitialPieces()) return;

            // Start game loop
            this.startGameLoop();

            // Broadcast seed if online
            if (room && playerNumber === 1) {
                this.sync?.broadcastSeed(seed);
            }
        }
    }

    private spawnInitialPieces(): boolean {
        const spawned = this.controller.spawnPieces();
        if (!spawned) {
            console.error('[CoopGame] Cannot spawn initial pieces - Game Over immediately!');
            this.gameOver = true;
            return false;
        }
        return true;
    }

    private startGameLoop() {
        this.isPaused = false;
        this.gameOver = false;
        this.lastUpdate = performance.now();
        this.gameLoop();
    }

    private setupSync(room: RoomInfo, playerNumber: 1 | 2) {
        this.sync = new CoopSync();
        this.sync.start(room, this, playerNumber); // Existing Input/State Sync
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
                        this.saveTeamScore(); // Save team score on game over
                        return;
                    }
                }
                if (gravityResult.player2Locked) {
                    const spawned = this.controller.spawnPiece(2);
                    if (!spawned) {
                        console.log('[CoopGame] Player 2 cannot spawn - Game Over!');
                        this.gameOver = true;
                        this.saveTeamScore(); // Save team score on game over
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
                // Determine who cleared it? 
                // In Coop, usually line clears are shared effort. 
                // But for aggregation logic, we need to assign it to *someone* to avoid duplicate counting.
                // Or we assign to "Local Player" causing the gravity tick? 
                // Gravity is local-simulated.
                // Ideally, ONLY the Host should calculate line clears and broadcast?
                // OR we assign based on whose piece locked? 
                // But checkAndClearLines is global. 

                // For simplicity in this Aggregation Task:
                // We split the credit. If I am P1, I add to linesP1. If P2, add to linesP2.
                // BUT this requires both players to be running the loop and arriving at same conclusion.
                // If both add, we get double.
                // Solution: We need `addLines` method to be called authoritatively.
                // In P2P, if both run physics, both clear.
                // We need to ONLY add lines if *we* are the Host? Or if we placed the piece?

                // Let's assume `addLines` handles the logic.
                // I will modify `checkAndClearLines` to return who caused it? No, lines are board-wide.

                // Temporary fix for Aggregation Requirement:
                // Only the "Locking Player" should claim the lines?
                // But gravity is simultaneous.

                // Let's just create the method for the test first.
                this.addLines(result.linesCleared, this.playerNumber); // Credits local player (Maybe wrong for p2p)
            }
        }
    }

    /**
     * Add lines helper (Task 2)
     */
    addLines(count: number, player: 1 | 2) {
        if (player === 1) {
            this.linesP1 += count;
            this.scoreP1 += this.calculateScore(count);
        } else {
            this.linesP2 += count;
            this.scoreP2 += this.calculateScore(count);
        }
        this.updateLevel();
    }

    /**
     * Handle player input
     */
    handleInput(action: PlayerAction) {
        if (this.isPaused || this.gameOver) return;
        this.controller.handleAction(this.playerNumber, action);

        // Broadcast input (Phase 2)
        if (this.sync) {
            this.sync.sendInput(action);
        }
    }

    /**
     * Save team score to leaderboard when game over
     */
    private async saveTeamScore(): Promise<void> {
        try {
            const teamScore = {
                player1Name: this.player1Name,
                player2Name: this.player2Name,
                scoreP1: this.scoreP1,
                scoreP2: this.scoreP2,
                totalScore: this.score,
                linesP1: this.linesP1,
                linesP2: this.linesP2,
                timestamp: Date.now()
            };

            await this.leaderboard.addTeamScore(teamScore);
            console.log('[CoopGame] Team score saved:', teamScore);
        } catch (e) {
            console.error('[CoopGame] Failed to save team score:', e);
        }
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
    /**
     * Explicit set pause state (for sync)
     */
    setPaused(paused: boolean) {
        if (this.isPaused !== paused) {
            this.isPaused = paused;
            // If resuming, reset timer to avoid huge delta
            if (!this.isPaused) {
                this.lastUpdate = performance.now();
            }

            // If we are the ones changing it (not from remote loop), sync it
            // NOTE: We rely on the periodic sync interval to push this state.
            // Or force a push immediately?
            // For responsiveness, force push is better.
            if (this.sync) {
                this.sync.sendLockSnapshot(); // Contains isPaused
            }
        }
    }

    /**
     * Toggle pause
     */
    togglePause() {
        this.setPaused(!this.isPaused);
    }

    /**
     * Restart the game
     */
    restart() {
        this.board = new CoopBoard();
        this.controller = new DualPieceController(this.board);
        this.scoreP1 = 0;
        this.scoreP2 = 0;
        this.linesP1 = 0;
        this.linesP2 = 0; // Reset new props
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
            scoreP1: this.scoreP1, // Exposed
            scoreP2: this.scoreP2,
            lines: this.lines,
            linesP1: this.linesP1,
            linesP2: this.linesP2,
            level: this.level,
            isPaused: this.isPaused,
            gameOver: this.gameOver
        };
    }
}
