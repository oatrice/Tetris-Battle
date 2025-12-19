/**
 * CoopSync.ts
 * Synchronizes game state between two players in a Coop room using Firebase Realtime Database.
 */

import { RealtimeService } from '../services/RealtimeService';
import { RoomInfo } from './RoomManager';
import type { CoopGame } from './CoopGame';

export class CoopSync {
    private realtime = new RealtimeService();
    private readonly gameStatePath = 'tetrisCoop/gameState';
    private unsubscribe?: () => void;
    private coopGame?: CoopGame;
    private playerNumber: 1 | 2 = 1;
    private syncInterval?: number;

    /**
     * Start syncing the given CoopGame with the specified room.
     * @param room - Room information
     * @param game - CoopGame instance
     * @param playerNumber - Which player this client is (1 or 2)
     */
    start(room: RoomInfo, game: CoopGame, playerNumber: 1 | 2): void {
        this.coopGame = game;
        this.playerNumber = playerNumber;
        const path = `${this.gameStatePath}/${room.id}`;

        console.log(`[CoopSync] Starting sync for Player ${playerNumber} in room ${room.id}`);

        // Listen for remote changes
        this.unsubscribe = this.realtime.onValue<any>(path, (remote) => {
            if (remote && remote.playerId !== this.getLocalPlayerId()) {
                this.applyRemoteState(remote.state);
            }
        });

        // Push state periodically (every 100ms)
        this.syncInterval = window.setInterval(() => {
            if (!this.coopGame?.isPaused && !this.coopGame?.gameOver) {
                this.pushState(path);
            }
        }, 100);
    }

    /** Push current local game state to the DB */
    private async pushState(path: string) {
        if (!this.coopGame) return;

        const state = this.coopGame.getState();

        // Serialize state
        const syncState = {
            board: state.board.grid,
            player1: {
                piece: state.player1.piece ? {
                    type: state.player1.piece.type,
                    shape: state.player1.piece.shape,
                    rotationIndex: state.player1.piece.rotationIndex
                } : null,
                position: state.player1.position
            },
            player2: {
                piece: state.player2.piece ? {
                    type: state.player2.piece.type,
                    shape: state.player2.piece.shape,
                    rotationIndex: state.player2.piece.rotationIndex
                } : null,
                position: state.player2.position
            },
            score: state.score,
            lines: state.lines,
            level: state.level,
            isPaused: state.isPaused,
            gameOver: state.gameOver
        };

        try {
            await this.realtime.set(path, {
                playerId: this.getLocalPlayerId(),
                playerNumber: this.playerNumber,
                state: syncState,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[CoopSync] Failed to push state:', error);
        }
    }

    /** Apply remote state to the local game */
    private applyRemoteState(remoteState: any): void {
        if (!remoteState || !this.coopGame) return;

        // Only sync board state (both players contribute to the same board)
        if (remoteState.board) {
            this.coopGame.board.grid = remoteState.board;
        }

        // Sync the OTHER player's piece (not our own)
        const otherPlayer: 1 | 2 = this.playerNumber === 1 ? 2 : 1;
        const otherPlayerState = this.playerNumber === 1 ? remoteState.player2 : remoteState.player1;

        if (otherPlayerState?.piece) {
            const controller = this.coopGame.controller;
            const currentPiece = controller.getPiece(otherPlayer);

            // Update piece if it changed
            if (currentPiece && otherPlayerState.piece.type === currentPiece.type) {
                // Just update position if same piece
                const currentPos = controller.getPosition(otherPlayer);
                if (currentPos.x !== otherPlayerState.position.x ||
                    currentPos.y !== otherPlayerState.position.y) {
                    // Position updated remotely - this is handled by DualPieceController
                    // We don't force update to avoid conflicts
                }
            }
        }

        // Sync score/lines/level (use max values to avoid conflicts)
        if (remoteState.score !== undefined) {
            this.coopGame.score = Math.max(this.coopGame.score, remoteState.score);
        }
        if (remoteState.lines !== undefined) {
            this.coopGame.lines = Math.max(this.coopGame.lines, remoteState.lines);
        }
        if (remoteState.level !== undefined) {
            this.coopGame.level = Math.max(this.coopGame.level, remoteState.level);
        }
    }

    /** Helper to obtain a stable local player identifier */
    private getLocalPlayerId(): string {
        // Use Firebase auth UID if available, otherwise fallback to a random session id
        const authService = (window as any).authService as any;
        const currentUser = authService?.getAuth?.()?.currentUser;
        if (currentUser) {
            return currentUser.uid;
        }
        // Simple fallback stored in sessionStorage
        let id = sessionStorage.getItem('coopPlayerId');
        if (!id) {
            id = 'guest_' + Math.random().toString(36).substring(2, 10);
            sessionStorage.setItem('coopPlayerId', id);
        }
        return id;
    }

    /** Stop listening */
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        console.log('[CoopSync] Sync stopped');
    }
}
