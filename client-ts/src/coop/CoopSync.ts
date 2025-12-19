/**
 * CoopSync.ts
 * Synchronizes game state between two players in a Coop room using Firebase Realtime Database.
 */

import { RealtimeService } from '../services/RealtimeService';
import { Game } from '../game/Game';
import { RoomInfo } from './RoomManager';

export class CoopSync {
    private realtime = new RealtimeService();
    private readonly gameStatePath = 'tetrisCoop/gameState';
    private unsubscribe?: () => void;
    private game?: Game; // reference to the Game instance

    /**
     * Start syncing the given game with the specified room.
     * It will listen for remote updates and push local updates on each game tick.
     */
    start(room: RoomInfo, game: Game): void {
        this.game = game; // store reference for later use
        const path = `${this.gameStatePath}/${room.id}`;

        // Listen for remote changes
        this.unsubscribe = this.realtime.onValue<any>(path, (remote) => {
            if (remote && remote.playerId !== this.getLocalPlayerId()) {
                this.applyRemoteState(game, remote.state);
            }
        });

        // Hook into game.update to push local state after each tick
        const originalUpdate = game.update.bind(game);
        game.update = (delta: number) => {
            originalUpdate(delta);
            this.pushState(path);
        };
    }

    /** Push current local game state to the DB */
    private async pushState(path: string) {
        // Serialize minimal state needed for sync
        const state = {
            board: (this.game?.['board'] as any)?.grid,
            currentPiece: this.game?.['currentPiece']
                ? {
                    type: this.game?.['currentPiece']?.type,
                    shape: this.game?.['currentPiece']?.shape,
                    position: this.game?.['position'],
                }
                : null,
            nextPiece: this.game?.['nextPiece'],
            score: this.game?.['score'],
            lines: this.game?.['lines'],
            level: this.game?.['level'],
        };
        await this.realtime.set(path, { playerId: this.getLocalPlayerId(), state });
    }

    /** Apply remote state to the local game */
    private applyRemoteState(game: Game, remoteState: any): void {
        if (!remoteState) return;
        // Update board grid
        if (remoteState.board) (game['board'] as any).grid = remoteState.board;
        // Update current piece & position
        if (remoteState.currentPiece) {
            const cp = remoteState.currentPiece;
            if (game['currentPiece']) {
                game['currentPiece'].type = cp.type;
                game['currentPiece'].setShape(cp.shape);
            }
            if (game['position']) {
                game['position'] = { x: cp.position.x, y: cp.position.y };
            }
        }
        // Update next piece
        if (remoteState.nextPiece) game['nextPiece'] = remoteState.nextPiece;
        // Scores etc.
        if (remoteState.score !== undefined) game['score'] = remoteState.score;
        if (remoteState.lines !== undefined) game['lines'] = remoteState.lines;
        if (remoteState.level !== undefined) game['level'] = remoteState.level;
    }

    /** Helper to obtain a stable local player identifier */
    private getLocalPlayerId(): string {
        // Use Firebase auth UID if available, otherwise fallback to a random session id
        const authService = (window as any).authService as any; // will be set by GameUI
        if (authService && authService.getCurrentUser && authService.getCurrentUser()) {
            return authService.getCurrentUser().uid;
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
        if (this.unsubscribe) this.unsubscribe();
    }
}
