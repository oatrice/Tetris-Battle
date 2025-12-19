/**
 * CoopSync.ts
 * Synchronizes game state between two players in a Coop room using Firebase Realtime Database.
 */

import { RealtimeService } from '../services/RealtimeService';
import { RoomInfo } from './RoomManager';
import type { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';

export class CoopSync {
    private realtime = new RealtimeService();
    private readonly gameStatePath = 'tetrisCoop/gameState';
    private readonly inputPath = 'tetrisCoop/inputs';
    private unsubscribe?: () => void;
    private unsubscribeInput?: () => void;
    private unsubscribeSeed?: () => void;
    private unsubscribeHeartbeat?: () => void;
    private coopGame?: CoopGame;
    private playerNumber: 1 | 2 = 1;
    private syncInterval?: number;
    private heartbeatInterval?: number;

    // Phase 4: Sequence Numbers
    private localSequence = 0;
    private remoteSequence = 0;

    // Latency Monitoring
    public latency = 0; // ms

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
                // Pass full remote object or just sequence
                this.applyRemoteState(remote.state, remote.sequenceNumber);
            }
        });

        // Listen for remote inputs
        const roomInputPath = `${this.inputPath}/${room.id}`;
        this.lastInputTimestamp = Date.now(); // Ignore old inputs
        // Reset sequences on start
        this.localSequence = 0;
        this.remoteSequence = 0;

        this.unsubscribeInput = this.realtime.onValue<Record<string, any>>(roomInputPath, (inputs) => {
            if (inputs) {
                this.handleRemoteInputs(inputs);
            }
        });

        // Start Heartbeat
        this.startHeartbeat(room.id);

        // Push state periodically (every 100ms)
        this.syncInterval = window.setInterval(() => {
            if (!this.coopGame?.isPaused && !this.coopGame?.gameOver) {
                this.pushState(path);
            }
        }, 100);
    }

    /**
     * Broadcast a full State Snapshot immediately (e.g., on Piece Lock).
     * This acts as an authoritative sync from Master.
     */
    async sendLockSnapshot() {
        if (!this.coopGame) return;
        const path = `${this.gameStatePath}/${this.coopGame.room?.id}`;
        console.log('[CoopSync] sending LOCK SNAPSHOT');

        // Force immediate push with snapshot flag
        await this.pushState(path, true);
    }

    /** Push current local game state to the DB */
    private async pushState(path: string, isSnapshot: boolean = false) {
        if (!this.coopGame) return;

        const state = this.coopGame.getState();
        this.localSequence++;

        // Serialize state
        const syncState = {
            isSnapshot, // Flag to indicate this is a critical snapshot
            board: state.board.grid,
            nextPieces: {
                player1: state.nextPieces.player1.type,
                player2: state.nextPieces.player2.type
            },
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
                sequenceNumber: this.localSequence,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[CoopSync] Failed to push state:', error);
        }
    }

    /** Apply remote state to the local game */
    private applyRemoteState(remoteState: any, sequenceNumber?: number): void {
        if (!remoteState || !this.coopGame) return;

        // Sequence Check
        if (typeof sequenceNumber === 'number') {
            if (sequenceNumber <= this.remoteSequence) {
                // Ignore old state
                return;
            }
            this.remoteSequence = sequenceNumber;
        }

        const isSnapshot = remoteState.isSnapshot === true;

        // 1. Overwrite Board (Always authoritative from Host/Remote update)
        if (remoteState.board) {
            this.coopGame.board.grid = remoteState.board;
        }

        // 2. Overwrite Score/Lines (Authoritative)
        if (remoteState.score !== undefined) {
            this.coopGame.score = remoteState.score; // Force overwrite
        }
        if (remoteState.lines !== undefined) {
            this.coopGame.lines = remoteState.lines; // Force overwrite
        }

        // 3. Overwrite Next Pieces (Critical for "Snapshot" behavior)
        if (remoteState.nextPieces) {
            // If we are P2, we MUST accept P1's next pieces
            // If snapshot, we force it unconditionally
            if (this.playerNumber === 2 || isSnapshot) {
                this.coopGame.controller.setNextPiece(1, remoteState.nextPieces.player1);
                this.coopGame.controller.setNextPiece(2, remoteState.nextPieces.player2);
            }
        }

        // Initial Sync: If I am Guest and have no piece, take it from Host
        if (this.playerNumber === 2 && !this.coopGame.controller.getPiece(2)) {
            if (remoteState.player2 && remoteState.player2.piece) {
                console.log('[CoopSync] Initializing Guest Piece from Host');
                this.coopGame.controller.setPiece(2, remoteState.player2.piece, remoteState.player2.position);
            }
        }

        // Sync the OTHER player's piece (not our own)
        const otherPlayer: 1 | 2 = this.playerNumber === 1 ? 2 : 1;
        const otherPlayerState = this.playerNumber === 1 ? remoteState.player2 : remoteState.player1;

        if (otherPlayerState?.piece) {
            const controller = this.coopGame.controller;
            // Force sync if it is a snapshot to correct desync
            if (isSnapshot) {
                console.log(`[CoopSync] Snapshot received: Forcing position for Player ${otherPlayer}`);
                this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
            } else {
                // Standard interpolation/update logic
                const currentPiece = controller.getPiece(otherPlayer);

                // Update piece if it changed or doesn't exist loclly
                if (currentPiece && otherPlayerState.piece.type === currentPiece.type) {
                    // Just update position if same piece
                    const currentPos = controller.getPosition(otherPlayer);
                    if (currentPos.x !== otherPlayerState.position.x ||
                        currentPos.y !== otherPlayerState.position.y) {
                        // Force update position to match remote
                        this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
                    } else if (otherPlayerState.piece.rotationIndex !== currentPiece.rotationIndex) {
                        // Rotation changed
                        this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
                    }
                } else {
                    // Piece changed or we don't have it yet - Force Sync
                    console.log(`[CoopSync] Syncing piece for Player ${otherPlayer} (Type: ${otherPlayerState.piece.type})`);
                    this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
                }
            }
        } else {
            // Remote player has no piece (e.g. just locked it, or game over)
            // We should probably clear it locally too if we want perfect sync,
            // but DualPieceController might handle locking on its own. 
            // For visualization, if they don't have a piece, we shouldn't show one?
            // But existing logic spawns strictly on lock.
            // Let's leave this for now to avoid flickering.
        }

    }

    /**
     * Broadcast the random seed to the room (Master only)
     */
    async broadcastSeed(seed: number) {
        if (!this.coopGame?.room) return;
        const path = `${this.gameStatePath}/${this.coopGame.room.id}/seed`;
        console.log(`[CoopSync] Broadcasting seed: ${seed}`);
        await this.realtime.set(path, seed);
    }

    /**
     * Listen for the random seed (Peer only)
     */
    waitForSeed(callback: (seed: number) => void) {
        if (!this.coopGame?.room) return;
        const path = `${this.gameStatePath}/${this.coopGame.room.id}/seed`;
        console.log('[CoopSync] Waiting for seed...');

        // We use onValue but maybe we only need it once. 
        // However, if we restart, seed might change. So keep listening?
        // Usually seed is set once per match.
        this.unsubscribeSeed = this.realtime.onValue<number>(path, (seed) => {
            if (typeof seed === 'number') {
                console.log(`[CoopSync] Received seed: ${seed}`);
                callback(seed);
            }
        });
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
        if (this.unsubscribeInput) {
            this.unsubscribeInput();
        }
        if (this.unsubscribeSeed) {
            this.unsubscribeSeed();
        }
        if (this.unsubscribeHeartbeat) {
            this.unsubscribeHeartbeat();
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        console.log('[CoopSync] Sync stopped');
    }

    // Input Synchronization Logic
    private lastInputTimestamp: number = 0;

    /**
     * Send a lightweight input packet
     */
    async sendInput(action: PlayerAction) {
        if (!this.coopGame?.room) return;

        this.localSequence++;

        const packet = {
            action,
            playerNumber: this.playerNumber,
            playerId: this.getLocalPlayerId(),
            sequenceNumber: this.localSequence,
            timestamp: Date.now()
        };

        const path = `${this.inputPath}/${this.coopGame.room.id}`;
        // Use push to append to the list
        await this.realtime.push(path, packet);
    }

    /**
     * Handle incoming input packets
     */
    private handleRemoteInputs(inputs: Record<string, any>) {
        if (!this.coopGame) return;

        const entries = Object.entries(inputs);
        // Sort by sequence number if available, else timestamp
        entries.sort((a, b) => {
            const seqA = a[1].sequenceNumber || 0;
            const seqB = b[1].sequenceNumber || 0;
            if (seqA && seqB) return seqA - seqB;
            return a[1].timestamp - b[1].timestamp;
        });

        for (const [, packet] of entries) {
            // content validation
            if (!packet || typeof packet.timestamp !== 'number') continue;

            // processing check
            if (packet.playerId === this.getLocalPlayerId()) continue; // Ignore own inputs

            // Phase 4: Sequence Check
            if (packet.sequenceNumber) {
                if (packet.sequenceNumber <= this.remoteSequence) {
                    continue; // Ignore old/duplicate packet
                }
                this.remoteSequence = packet.sequenceNumber;
            } else {
                // Fallback for non-sequenced packets (shouldn't happen in P4)
                if (packet.timestamp <= this.lastInputTimestamp) continue;
            }

            // Apply input
            this.lastInputTimestamp = packet.timestamp;

            // Only apply for the OTHER player
            const expectedOtherPlayer = this.playerNumber === 1 ? 2 : 1;
            if (packet.playerNumber === expectedOtherPlayer) {
                // console.log(`[CoopSync] Applying remote input: ${packet.action} (Seq: ${packet.sequenceNumber})`);
                this.coopGame.controller.handleAction(expectedOtherPlayer, packet.action);
            }
        }
    }

    /**
     * Start Heartbeat / Ping-Pong mechanism
     */
    private startHeartbeat(roomId: string) {
        const myPingPath = `tetrisCoop/heartbeat/${roomId}/${this.playerNumber}/ping`;
        const myPongPath = `tetrisCoop/heartbeat/${roomId}/${this.playerNumber}/pong`;

        const otherPlayer = this.playerNumber === 1 ? 2 : 1;
        const peerPingPath = `tetrisCoop/heartbeat/${roomId}/${otherPlayer}/ping`;
        const peerPongPath = `tetrisCoop/heartbeat/${roomId}/${otherPlayer}/pong`;

        // 1. Listen for MY Pong (Response from Peer)
        // receiving pong means round-trip complete
        this.unsubscribeHeartbeat = this.realtime.onValue<number>(myPongPath, (timestamp) => {
            if (timestamp) {
                const now = Date.now();
                const rtt = now - timestamp;
                this.latency = Math.ceil(rtt / 2); // One-way approximation
                // console.log(`[CoopSync] Latency: ${this.latency}ms`);
            }
        });

        // 2. Listen for Peer's Ping (To Echo back)
        const unsubPeerPing = this.realtime.onValue<number>(peerPingPath, (timestamp) => {
            if (timestamp) {
                // Echo back immediately to THEIR pong path
                // console.log('[CoopSync] Received Ping, sending Pong');
                this.realtime.set(peerPongPath, timestamp);
            }
        });

        // Store unsubs (Composite)
        const oldUnsub = this.unsubscribeHeartbeat;
        this.unsubscribeHeartbeat = () => {
            if (oldUnsub) oldUnsub();
            unsubPeerPing();
        };

        // 3. Send Ping Loop
        this.heartbeatInterval = window.setInterval(() => {
            this.realtime.set(myPingPath, Date.now());
        }, 2000); // Every 2 seconds
    }
}
