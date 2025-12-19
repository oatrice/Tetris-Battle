/**
 * DualPiece.ts
 * Controller for two simultaneous pieces in Coop Mode
 * 
 * Player 1: Controls left piece (zone 0-11)
 * Player 2: Controls right piece (zone 12-23)
 */

import { CoopBoard } from './CoopBoard';
import { Tetromino, TetrominoType } from '../game/Tetromino';

export enum PlayerAction {
    MOVE_LEFT = 'MOVE_LEFT',
    MOVE_RIGHT = 'MOVE_RIGHT',
    ROTATE = 'ROTATE',
    SOFT_DROP = 'SOFT_DROP',
    HARD_DROP = 'HARD_DROP',
    HOLD = 'HOLD'
}

interface PlayerPiece {
    piece: Tetromino | null;
    position: { x: number; y: number };
}

type PlayerNumber = 1 | 2;

export class DualPieceController {
    private board: CoopBoard;
    private players: Map<PlayerNumber, PlayerPiece>;
    private nextPieces: Map<PlayerNumber, Tetromino>;
    private pieceTypes: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

    constructor(board: CoopBoard) {
        this.board = board;
        this.players = new Map();
        this.nextPieces = new Map();

        // Initialize empty player states
        this.players.set(1, { piece: null, position: { x: 0, y: 0 } });
        this.players.set(2, { piece: null, position: { x: 0, y: 0 } });

        // Generate initial next pieces
        this.nextPieces.set(1, this.generatePiece());
        this.nextPieces.set(2, this.generatePiece());
    }

    /**
     * Generate a random Tetromino
     */
    private generatePiece(): Tetromino {
        const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        return new Tetromino(type);
    }

    /**
     * Get the next piece for a player
     */
    getNextPiece(player: PlayerNumber): Tetromino {
        let piece = this.nextPieces.get(player);
        if (!piece) {
            piece = this.generatePiece();
            this.nextPieces.set(player, piece);
        }
        return piece;
    }

    /**
     * Spawn pieces for both players
     * Returns false if either player cannot spawn (game over)
     */
    spawnPieces(): boolean {
        const p1Spawned = this.spawnPiece(1);
        const p2Spawned = this.spawnPiece(2);
        return p1Spawned && p2Spawned; // Both must succeed
    }

    /**
     * Spawn a piece for a specific player
     * Returns false if spawn position is blocked (game over condition)
     */
    spawnPiece(player: PlayerNumber): boolean {
        const spawnPos = this.board.getSpawnPosition(player);

        // Get next piece and generate new next piece
        const piece = this.getNextPiece(player);
        this.nextPieces.set(player, this.generatePiece());

        // Check if spawn position is blocked
        if (!this.board.canPlacePiece(piece, spawnPos.x, spawnPos.y)) {
            console.warn(`[DualPiece] Cannot spawn piece for Player ${player} - Game Over!`);
            return false; // Game Over
        }

        this.players.set(player, {
            piece,
            position: { x: spawnPos.x, y: spawnPos.y }
        });

        return true; // Spawn successful
    }

    /**
     * Get the current piece for a player
     */
    getPiece(player: PlayerNumber): Tetromino | null {
        return this.players.get(player)?.piece ?? null;
    }

    /**
     * Get the current position for a player's piece
     */
    getPosition(player: PlayerNumber): { x: number; y: number } {
        return this.players.get(player)?.position ?? { x: 0, y: 0 };
    }

    /**
     * Handle player action
     */
    handleAction(player: PlayerNumber, action: PlayerAction): void {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return;

        const { x, y } = playerState.position;
        switch (action) {
            case PlayerAction.MOVE_LEFT:
                this.tryMove(player, x - 1, y);
                break;

            case PlayerAction.MOVE_RIGHT:
                this.tryMove(player, x + 1, y);
                break;

            case PlayerAction.ROTATE:
                this.tryRotate(player);
                break;

            case PlayerAction.SOFT_DROP:
                this.tryMove(player, x, y + 1);
                break;

            case PlayerAction.HARD_DROP:
                this.hardDrop(player);
                break;
        }
    }

    /**
     * Try to move piece to new position
     */
    private tryMove(player: PlayerNumber, newX: number, newY: number): boolean {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return false;

        if (this.board.isValidPosition(playerState.piece, newX, newY)) {
            playerState.position = { x: newX, y: newY };
            return true;
        }
        return false;
    }

    /**
     * Try to rotate piece
     */
    private tryRotate(player: PlayerNumber): boolean {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return false;

        const piece = playerState.piece;
        const { x, y } = playerState.position;

        // Save current state
        const originalShape = piece.shape.map(row => [...row]);
        const originalRotation = piece.rotationIndex;

        // Try rotation
        piece.rotate();

        // Check if valid
        if (this.board.isValidPosition(piece, x, y)) {
            return true;
        }

        // Try wall kicks
        const kicks = piece.getWallKicks(piece.rotationIndex);
        for (const kick of kicks) {
            if (this.board.isValidPosition(piece, x + kick.x, y + kick.y)) {
                playerState.position = { x: x + kick.x, y: y + kick.y };
                return true;
            }
        }

        // Revert if all kicks fail
        piece.setShape(originalShape);
        piece.rotationIndex = originalRotation;
        return false;
    }

    /**
     * Hard drop piece to bottom
     */
    private hardDrop(player: PlayerNumber): void {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return;

        const { piece, position } = playerState;
        let newY = position.y;

        // Find lowest valid position
        while (this.board.isValidPosition(piece, position.x, newY + 1)) {
            newY++;
        }

        // Lock the piece
        this.board.lockPiece(piece, position.x, newY);
        playerState.position = { x: position.x, y: newY };
    }

    /**
     * Apply gravity to both pieces
     * Returns info about which pieces were locked
     */
    applyGravity(): { player1Locked: boolean; player2Locked: boolean } {
        const player1Locked = this.applyGravityToPlayer(1);
        const player2Locked = this.applyGravityToPlayer(2);
        return { player1Locked, player2Locked };
    }

    /**
     * Apply gravity to a specific player
     * Returns true if piece was locked
     */
    private applyGravityToPlayer(player: PlayerNumber): boolean {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return false;

        const { x, y } = playerState.position;
        const newY = y + 1;

        // Try to move down
        if (this.board.isValidPosition(playerState.piece, x, newY)) {
            playerState.position = { x, y: newY };
            return false; // Not locked
        }

        // Can't move down - lock the piece
        this.board.lockPiece(playerState.piece, x, y);
        return true; // Locked - needs respawn
    }

    /**
     * Check and clear completed lines
     */
    checkAndClearLines(): { linesCleared: number } {
        const result = this.board.clearLines();
        return { linesCleared: result.count };
    }
}
