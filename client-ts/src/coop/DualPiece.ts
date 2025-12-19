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
    private pieceTypes: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

    constructor(board: CoopBoard) {
        this.board = board;
        this.players = new Map();

        // Initialize empty player states
        this.players.set(1, { piece: null, position: { x: 0, y: 0 } });
        this.players.set(2, { piece: null, position: { x: 0, y: 0 } });
    }

    /**
     * Generate a random Tetromino
     */
    private generatePiece(): Tetromino {
        const type = this.pieceTypes[Math.floor(Math.random() * this.pieceTypes.length)];
        return new Tetromino(type);
    }

    /**
     * Spawn pieces for both players
     */
    spawnPieces(): void {
        this.spawnPiece(1);
        this.spawnPiece(2);
    }

    /**
     * Spawn a piece for a specific player
     */
    spawnPiece(player: PlayerNumber): void {
        const spawnPos = this.board.getSpawnPosition(player);
        const piece = this.generatePiece();

        this.players.set(player, {
            piece,
            position: { x: spawnPos.x, y: spawnPos.y }
        });
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
     */
    applyGravity(): void {
        this.applyGravityToPlayer(1);
        this.applyGravityToPlayer(2);
    }

    /**
     * Apply gravity to a specific player
     */
    private applyGravityToPlayer(player: PlayerNumber): void {
        const playerState = this.players.get(player);
        if (!playerState || !playerState.piece) return;

        const { piece, position } = playerState;

        if (this.board.isValidPosition(piece, position.x, position.y + 1)) {
            playerState.position.y++;
        } else {
            // Lock piece and spawn new one
            this.board.lockPiece(piece, position.x, position.y);
            this.spawnPiece(player);
        }
    }

    /**
     * Check and clear completed lines
     */
    checkAndClearLines(): { linesCleared: number } {
        const result = this.board.clearLines();
        return { linesCleared: result.count };
    }
}
