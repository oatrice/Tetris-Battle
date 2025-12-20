/**
 * HybridSync.ts
 * Hybrid WebRTC Synchronization using Firebase for Signaling + P2P for Game Sync
 * 
 * Flow:
 * 1. Use Firebase to exchange WebRTC Offer/Answer/ICE (Signaling Phase)
 * 2. Establish P2P DataChannel connection
 * 3. Switch to P2P for all game synchronization (no more Firebase!)
 * 
 * Benefits:
 * - Easy connection setup (good UX)
 * - Low latency gaming (direct P2P)
 * - Works offline after initial connection
 */

import { ISyncProvider, ConnectionState } from './ISyncProvider';
import { RoomInfo } from './RoomManager';
import type { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';
import { FirebaseSignaling } from './FirebaseSignaling';

/**
 * Hybrid Sync = Firebase Signaling + WebRTC P2P
 */
export class HybridSync implements ISyncProvider {
    private firebaseSignaling: FirebaseSignaling;
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private _connectionState: ConnectionState = 'disconnected';

    // Game reference
    private coopGame?: CoopGame;
    private playerNumber: 1 | 2 = 1;
    private isHost: boolean = false;

    // Latency tracking
    public latency: number = 0;
    private pingInterval?: number;
    private lastPingTime: number = 0;

    // Message handling
    private localSequence: number = 0;
    private remoteSequence: number = 0;
    private pendingInputs: any[] = [];
    private seedCallback?: (seed: number) => void;

    // Callbacks
    public onConnectionStateChange?: (state: ConnectionState) => void;

    // ICE configuration
    private readonly iceConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };

    constructor(roomId: string) {
        this.firebaseSignaling = new FirebaseSignaling(roomId);
    }

    /**
     * Get current connection state
     */
    get connectionState(): ConnectionState {
        return this._connectionState;
    }

    /**
     * Check if ready to send data
     */
    isReady(): boolean {
        return this._connectionState === 'connected' &&
            this.dataChannel?.readyState === 'open';
    }

    // ========== ISyncProvider Implementation ==========

    /**
     * Start sync - begins WebRTC connection process
     */
    start(_room: RoomInfo, game: CoopGame, playerNumber: 1 | 2): void {
        this.coopGame = game;
        this.playerNumber = playerNumber;
        this.isHost = playerNumber === 1;

        console.log(`[HybridSync] Starting as ${this.isHost ? 'Host' : 'Guest'} (Player ${playerNumber})`);

        if (this.isHost) {
            this.startAsHost();
        } else {
            this.startAsGuest();
        }
    }

    /**
     * Stop sync and cleanup
     */
    stop(): void {
        this.cleanup();
        console.log('[HybridSync] Stopped');
    }

    /**
     * Send player input via P2P
     */
    async sendInput(action: PlayerAction): Promise<void> {
        const message = {
            type: 'input',
            action,
            playerNumber: this.playerNumber,
            sequenceNumber: ++this.localSequence,
            timestamp: Date.now()
        };

        if (this.isReady()) {
            this.sendMessage(message);
        } else {
            this.pendingInputs.push(message);
        }
    }

    /**
     * Send lock snapshot via P2P
     */
    async sendLockSnapshot(): Promise<void> {
        if (!this.coopGame || !this.isReady()) return;

        const state = this.coopGame.getState();
        const message = {
            type: 'snapshot',
            state: this.serializeState(state),
            sequenceNumber: ++this.localSequence,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    /**
     * Broadcast seed via P2P
     */
    async broadcastSeed(seed: number): Promise<void> {
        const message = {
            type: 'seed',
            seed,
            timestamp: Date.now()
        };

        if (this.isReady()) {
            this.sendMessage(message);
        } else {
            // Wait for connection
            const retryInterval = setInterval(() => {
                if (this.isReady()) {
                    this.sendMessage(message);
                    clearInterval(retryInterval);
                }
            }, 100);
            setTimeout(() => clearInterval(retryInterval), 10000);
        }
    }

    /**
     * Wait for seed from peer
     */
    waitForSeed(callback: (seed: number) => void): void {
        this.seedCallback = callback;
    }

    // ========== WebRTC Connection Setup ==========

    /**
     * Start as Host (Player 1)
     */
    private async startAsHost(): Promise<void> {
        try {
            this.setConnectionState('connecting');

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.iceConfig);
            this.setupPeerConnectionListeners();

            // Create data channel
            this.dataChannel = this.peerConnection.createDataChannel('gameSync', {
                ordered: true,
                maxRetransmits: 3
            });
            this.setupDataChannelListeners(this.dataChannel);

            // Setup Firebase signaling listeners
            this.firebaseSignaling.onAnswer(async (answer) => {
                console.log('[HybridSync] Received answer from Guest');
                if (this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(answer);
                }
            });

            this.firebaseSignaling.onIceCandidate(async (candidate) => {
                console.log('[HybridSync] Received ICE candidate from Guest');
                if (this.peerConnection && candidate.candidate) {
                    await this.peerConnection.addIceCandidate(candidate);
                }
            });

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            await this.firebaseSignaling.sendOffer(offer);

            console.log('[HybridSync] Offer sent to Guest via Firebase');

        } catch (error) {
            console.error('[HybridSync] Host initialization failed:', error);
            this.setConnectionState('failed');
        }
    }

    /**
     * Start as Guest (Player 2)
     */
    private async startAsGuest(): Promise<void> {
        try {
            this.setConnectionState('connecting');

            // Create peer connection
            this.peerConnection = new RTCPeerConnection(this.iceConfig);
            this.setupPeerConnectionListeners();

            // Guest receives data channel from Host
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannelListeners(this.dataChannel);
            };

            // Wait for offer from Host
            this.firebaseSignaling.onOffer(async (offer) => {
                console.log('[HybridSync] Received offer from Host');
                if (!this.peerConnection) return;

                await this.peerConnection.setRemoteDescription(offer);

                // Create and send answer
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);
                await this.firebaseSignaling.sendAnswer(answer);

                console.log('[HybridSync] Answer sent to Host via Firebase');
            });

            // Listen for ICE candidates
            this.firebaseSignaling.onIceCandidate(async (candidate) => {
                console.log('[HybridSync] Received ICE candidate from Host');
                if (this.peerConnection && candidate.candidate) {
                    await this.peerConnection.addIceCandidate(candidate);
                }
            });

        } catch (error) {
            console.error('[HybridSync] Guest initialization failed:', error);
            this.setConnectionState('failed');
        }
    }

    // ========== WebRTC Event Handlers ==========

    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState;
            console.log(`[HybridSync] Connection state: ${state}`);

            switch (state) {
                case 'connected':
                    this.setConnectionState('connected');
                    this.onP2PConnected();
                    break;
                case 'disconnected':
                case 'closed':
                    this.setConnectionState('disconnected');
                    break;
                case 'failed':
                    this.setConnectionState('failed');
                    break;
            }
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[HybridSync] Sending ICE candidate via Firebase');
                this.firebaseSignaling.sendIceCandidate(event.candidate);
            }
        };
    }

    private setupDataChannelListeners(channel: RTCDataChannel): void {
        channel.onopen = () => {
            console.log('[HybridSync] ✅ P2P DataChannel opened!');
            this.setConnectionState('connected');
            this.onP2PConnected();
        };

        channel.onclose = () => {
            console.log('[HybridSync] DataChannel closed');
            this.setConnectionState('disconnected');
        };

        channel.onerror = (error) => {
            console.error('[HybridSync] DataChannel error:', error);
            this.setConnectionState('failed');
        };

        channel.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    /**
     * Called when P2P connection is established
     */
    private onP2PConnected(): void {
        console.log('[HybridSync] 🎉 P2P Connection Established!');
        console.log('[HybridSync] Switching to P2P for game sync (Firebase no longer needed)');

        // Start ping/pong for latency
        this.startPingPong();

        // Flush pending inputs
        this.flushPendingInputs();

        // Can cleanup Firebase signaling now (optional, but saves resources)
        // this.firebaseSignaling.cleanup();
    }

    // ========== Message Handling ==========

    private sendMessage(message: any): void {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.warn('[HybridSync] Cannot send: DataChannel not open');
            return;
        }

        try {
            this.dataChannel.send(JSON.stringify(message));
        } catch (error) {
            console.error('[HybridSync] Send error:', error);
        }
    }

    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'seed':
                    this.handleSeedMessage(message);
                    break;
                case 'input':
                    this.handleInputMessage(message);
                    break;
                case 'state':
                case 'snapshot':
                    this.handleStateMessage(message);
                    break;
                case 'ping':
                    this.handlePing(message);
                    break;
                case 'pong':
                    this.handlePong(message);
                    break;
            }
        } catch (error) {
            console.error('[HybridSync] Message parse error:', error);
        }
    }

    private handleSeedMessage(message: any): void {
        console.log(`[HybridSync] Received seed: ${message.seed}`);
        this.seedCallback?.(message.seed);
    }

    private handleInputMessage(message: any): void {
        if (!this.coopGame) return;

        if (message.sequenceNumber && message.sequenceNumber <= this.remoteSequence) {
            return;
        }
        this.remoteSequence = message.sequenceNumber || this.remoteSequence;

        const otherPlayer: 1 | 2 = this.playerNumber === 1 ? 2 : 1;
        if (message.playerNumber === otherPlayer) {
            this.coopGame.controller.handleAction(otherPlayer, message.action);
        }
    }

    private handleStateMessage(message: any): void {
        if (!this.coopGame) return;

        if (message.sequenceNumber && message.sequenceNumber <= this.remoteSequence) {
            return;
        }
        this.remoteSequence = message.sequenceNumber || this.remoteSequence;

        this.applyRemoteState(message.state, message.type === 'snapshot');
    }

    private applyRemoteState(remoteState: any, isSnapshot: boolean): void {
        if (!this.coopGame || !remoteState) return;

        // Same logic as WebRTCSync (reuse from CoopSync)
        if (remoteState.board) {
            this.coopGame.board.grid = remoteState.board;
        }

        if (typeof remoteState.scoreP1 === 'number' && typeof remoteState.scoreP2 === 'number') {
            if (this.playerNumber === 1) {
                this.coopGame.scoreP2 = remoteState.scoreP2;
                this.coopGame.linesP2 = remoteState.linesP2;
            } else {
                this.coopGame.scoreP1 = remoteState.scoreP1;
                this.coopGame.linesP1 = remoteState.linesP1;
            }

            if (isSnapshot) {
                this.coopGame.scoreP1 = remoteState.scoreP1;
                this.coopGame.scoreP2 = remoteState.scoreP2;
                this.coopGame.linesP1 = remoteState.linesP1;
                this.coopGame.linesP2 = remoteState.linesP2;
            }
        }

        if (typeof remoteState.isPaused === 'boolean') {
            if (this.coopGame.isPaused !== remoteState.isPaused) {
                this.coopGame.isPaused = remoteState.isPaused;
                if (!this.coopGame.isPaused) {
                    (this.coopGame as any).lastUpdate = performance.now();
                }
            }
        }

        if (remoteState.nextPieces) {
            if (this.playerNumber === 2 || isSnapshot) {
                this.coopGame.controller.setNextPiece(1, remoteState.nextPieces.player1);
                this.coopGame.controller.setNextPiece(2, remoteState.nextPieces.player2);
            }
        }

        const otherPlayer: 1 | 2 = this.playerNumber === 1 ? 2 : 1;
        const otherPlayerState = this.playerNumber === 1 ? remoteState.player2 : remoteState.player1;

        if (otherPlayerState?.piece) {
            if (isSnapshot) {
                this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
            } else {
                const currentPiece = this.coopGame.controller.getPiece(otherPlayer);
                if (!currentPiece || currentPiece.type !== otherPlayerState.piece.type) {
                    this.coopGame.controller.setPiece(otherPlayer, otherPlayerState.piece, otherPlayerState.position);
                }
            }
        }
    }

    private serializeState(state: any): any {
        return {
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
            scoreP1: state.scoreP1,
            scoreP2: state.scoreP2,
            lines: state.lines,
            linesP1: state.linesP1,
            linesP2: state.linesP2,
            level: state.level,
            isPaused: state.isPaused,
            gameOver: state.gameOver
        };
    }

    private flushPendingInputs(): void {
        if (!this.isReady()) return;

        while (this.pendingInputs.length > 0) {
            const input = this.pendingInputs.shift();
            if (input) {
                this.sendMessage(input);
            }
        }
    }

    // ========== Ping/Pong for Latency ==========

    private startPingPong(): void {
        this.pingInterval = window.setInterval(() => {
            this.sendPing();
        }, 2000);
    }

    private sendPing(): void {
        if (!this.isReady()) return;

        this.lastPingTime = Date.now();
        this.sendMessage({
            type: 'ping',
            timestamp: this.lastPingTime
        });
    }

    private handlePing(message: any): void {
        this.sendMessage({
            type: 'pong',
            timestamp: message.timestamp
        });
    }

    private handlePong(message: any): void {
        const rtt = Date.now() - message.timestamp;
        this.latency = Math.ceil(rtt / 2);
    }

    // ========== Helpers ==========

    private setConnectionState(state: ConnectionState): void {
        if (this._connectionState !== state) {
            this._connectionState = state;
            this.onConnectionStateChange?.(state);
        }
    }

    private cleanup(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
        }

        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.firebaseSignaling.cleanup();

        this.pendingInputs = [];
        this.localSequence = 0;
        this.remoteSequence = 0;
        this.latency = 0;

        this.setConnectionState('disconnected');
    }
}
