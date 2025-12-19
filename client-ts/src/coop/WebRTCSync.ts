/**
 * WebRTCSync.ts
 * WebRTC P2P Synchronization for Coop Mode
 * Supports manual signaling (QR/Copy-Paste) for offline play
 */

import { ISyncProvider, IManualSignaling, ConnectionState, SignalingData } from './ISyncProvider';
import { RoomInfo } from './RoomManager';
import type { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';

/**
 * Message types for WebRTC DataChannel
 */
interface WebRTCMessage {
    type: 'seed' | 'input' | 'state' | 'snapshot' | 'ping' | 'pong';
    timestamp: number;
    sequenceNumber?: number;
    payload?: unknown;
}

interface SeedMessage extends WebRTCMessage {
    type: 'seed';
    seed: number;
}

interface InputMessage extends WebRTCMessage {
    type: 'input';
    action: PlayerAction;
    playerNumber: 1 | 2;
}

interface StateMessage extends WebRTCMessage {
    type: 'state' | 'snapshot';
    state: unknown;
}

interface PingPongMessage extends WebRTCMessage {
    type: 'ping' | 'pong';
}

/**
 * WebRTC-based synchronization provider
 * Supports offline P2P connection via manual signaling
 */
export class WebRTCSync implements ISyncProvider, IManualSignaling {
    // Connection state
    private _connectionState: ConnectionState = 'disconnected';
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private iceCandidates: RTCIceCandidate[] = [];

    // Game reference
    private coopGame?: CoopGame;
    private playerNumber: 1 | 2 = 1;

    // Latency tracking
    public latency: number = 0;
    private pingInterval?: number;
    private lastPingTime: number = 0;

    // Message handling
    private localSequence: number = 0;
    private remoteSequence: number = 0;
    private pendingInputs: InputMessage[] = [];
    private sentMessages: WebRTCMessage[] = [];

    // Callbacks
    public onConnectionStateChange?: (state: ConnectionState) => void;
    private seedCallback?: (seed: number) => void;

    // ICE servers configuration (STUN only for local network)
    private readonly iceConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 0
    };

    /**
     * Get current connection state
     */
    get connectionState(): ConnectionState {
        return this._connectionState;
    }

    /**
     * Check if the connection is ready to send data
     */
    isReady(): boolean {
        return this._connectionState === 'connected' &&
            this.dataChannel?.readyState === 'open';
    }

    /**
     * Get count of pending inputs (queued while disconnected)
     */
    getPendingInputCount(): number {
        return this.pendingInputs.length;
    }

    // ========== Manual Signaling (QR/Copy-Paste) ==========

    /**
     * Create an offer for manual signaling
     * Returns a JSON string that can be displayed as QR or copied
     */
    async createOffer(): Promise<string> {
        this.cleanup();
        this.peerConnection = new RTCPeerConnection(this.iceConfig);
        this.setupPeerConnectionListeners();

        // Create data channel (host creates it)
        this.dataChannel = this.peerConnection.createDataChannel('gameSync', {
            ordered: true,
            maxRetransmits: 3
        });
        this.setupDataChannelListeners(this.dataChannel);

        this.setConnectionState('connecting');

        // Create and set local description
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Wait for ICE gathering to complete
        await this.waitForIceGathering();

        // Return complete offer with ICE candidates
        const signalingData: SignalingData = {
            type: 'offer',
            sdp: this.peerConnection.localDescription?.sdp
        };

        return JSON.stringify(signalingData);
    }

    /**
     * Accept an offer and generate an answer
     * @param offerString - JSON string from createOffer()
     */
    async acceptOffer(offerString: string): Promise<string> {
        // Parse and validate offer
        let offerData: SignalingData;
        try {
            offerData = JSON.parse(offerString);
        } catch {
            throw new Error('Invalid offer format: not valid JSON');
        }

        if (offerData.type !== 'offer' || !offerData.sdp) {
            throw new Error('Invalid offer format: missing type or sdp');
        }

        this.cleanup();
        this.peerConnection = new RTCPeerConnection(this.iceConfig);
        this.setupPeerConnectionListeners();

        // Guest receives data channel from host
        this.peerConnection.ondatachannel = (event) => {
            this.dataChannel = event.channel;
            this.setupDataChannelListeners(this.dataChannel);
        };

        this.setConnectionState('connecting');

        // Set remote description (offer)
        await this.peerConnection.setRemoteDescription({
            type: 'offer',
            sdp: offerData.sdp
        });

        // Create and set local description (answer)
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        // Wait for ICE gathering
        await this.waitForIceGathering();

        // Return complete answer
        const signalingData: SignalingData = {
            type: 'answer',
            sdp: this.peerConnection.localDescription?.sdp
        };

        return JSON.stringify(signalingData);
    }

    /**
     * Accept an answer to complete the connection
     * @param answerString - JSON string from acceptOffer()
     */
    async acceptAnswer(answerString: string): Promise<void> {
        if (!this.peerConnection) {
            throw new Error('No peer connection. Call createOffer() first.');
        }

        // Parse and validate answer
        let answerData: SignalingData;
        try {
            answerData = JSON.parse(answerString);
        } catch {
            throw new Error('Invalid answer format: not valid JSON');
        }

        if (answerData.type !== 'answer' || !answerData.sdp) {
            throw new Error('Invalid answer format: missing type or sdp');
        }

        // Set remote description (answer)
        await this.peerConnection.setRemoteDescription({
            type: 'answer',
            sdp: answerData.sdp
        });
    }

    /**
     * Wait for ICE gathering to complete
     */
    private waitForIceGathering(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.peerConnection) {
                resolve();
                return;
            }

            if (this.peerConnection.iceGatheringState === 'complete') {
                resolve();
                return;
            }

            const checkState = () => {
                if (this.peerConnection?.iceGatheringState === 'complete') {
                    resolve();
                }
            };

            this.peerConnection.onicegatheringstatechange = checkState;

            // Also resolve when we get null candidate (gathering complete)
            const originalOnIceCandidate = this.peerConnection.onicecandidate;
            this.peerConnection.onicecandidate = (event) => {
                if (originalOnIceCandidate && this.peerConnection) {
                    originalOnIceCandidate.call(this.peerConnection, event);
                }
                if (event.candidate === null) {
                    resolve();
                }
            };

            // Timeout fallback
            setTimeout(resolve, 5000);
        });
    }

    // ========== ISyncProvider Implementation ==========

    /**
     * Start syncing with the game (after connection established)
     */
    start(_room: RoomInfo, game: CoopGame, playerNumber: 1 | 2): void {
        this.coopGame = game;
        this.playerNumber = playerNumber;
        this.localSequence = 0;
        this.remoteSequence = 0;

        console.log(`[WebRTCSync] Starting sync for Player ${playerNumber}`);

        // Start ping/pong for latency measurement
        this.startPingPong();

        // Flush pending inputs
        this.flushPendingInputs();
    }

    /**
     * Stop syncing and cleanup
     */
    stop(): void {
        this.cleanup();
        console.log('[WebRTCSync] Sync stopped');
    }

    /**
     * Send a player input to the peer
     */
    async sendInput(action: PlayerAction): Promise<void> {
        const message: InputMessage = {
            type: 'input',
            action,
            playerNumber: this.playerNumber,
            sequenceNumber: ++this.localSequence,
            timestamp: Date.now()
        };

        if (this.isReady()) {
            this.sendMessage(message);
        } else {
            // Queue if not connected
            this.pendingInputs.push(message);
        }
    }

    /**
     * Send a full state snapshot
     */
    async sendLockSnapshot(): Promise<void> {
        if (!this.coopGame || !this.isReady()) return;

        const state = this.coopGame.getState();
        const message: StateMessage = {
            type: 'snapshot',
            state: this.serializeState(state),
            sequenceNumber: ++this.localSequence,
            timestamp: Date.now()
        };

        this.sendMessage(message);
    }

    /**
     * Broadcast seed (host only)
     */
    async broadcastSeed(seed: number): Promise<void> {
        const message: SeedMessage = {
            type: 'seed',
            seed,
            timestamp: Date.now()
        };

        if (this.isReady()) {
            this.sendMessage(message);
        } else {
            // If not ready, wait and retry
            const retryInterval = setInterval(() => {
                if (this.isReady()) {
                    this.sendMessage(message);
                    clearInterval(retryInterval);
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => clearInterval(retryInterval), 10000);
        }
    }

    /**
     * Wait for seed (guest only)
     */
    waitForSeed(callback: (seed: number) => void): void {
        this.seedCallback = callback;
    }

    // ========== Private Methods ==========

    private setConnectionState(state: ConnectionState): void {
        if (this._connectionState !== state) {
            this._connectionState = state;
            this.onConnectionStateChange?.(state);
        }
    }

    private setupPeerConnectionListeners(): void {
        if (!this.peerConnection) return;

        this.peerConnection.onconnectionstatechange = () => {
            const pcState = this.peerConnection?.connectionState;
            console.log(`[WebRTCSync] Connection state: ${pcState}`);

            switch (pcState) {
                case 'connected':
                    this.setConnectionState('connected');
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
                this.iceCandidates.push(event.candidate);
            }
        };
    }

    private setupDataChannelListeners(channel: RTCDataChannel): void {
        channel.onopen = () => {
            console.log('[WebRTCSync] DataChannel opened');
            this.setConnectionState('connected');
            this.flushPendingInputs();
        };

        channel.onclose = () => {
            console.log('[WebRTCSync] DataChannel closed');
            this.setConnectionState('disconnected');
        };

        channel.onerror = (error) => {
            console.error('[WebRTCSync] DataChannel error:', error);
            this.setConnectionState('failed');
        };

        channel.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    private sendMessage(message: WebRTCMessage): void {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            console.warn('[WebRTCSync] Cannot send: DataChannel not open');
            return;
        }

        try {
            const json = JSON.stringify(message);
            this.dataChannel.send(json);
            this.sentMessages.push(message);
        } catch (error) {
            console.error('[WebRTCSync] Send error:', error);
        }
    }

    private handleMessage(data: string): void {
        try {
            const message: WebRTCMessage = JSON.parse(data);

            switch (message.type) {
                case 'seed':
                    this.handleSeedMessage(message as SeedMessage);
                    break;
                case 'input':
                    this.handleInputMessage(message as InputMessage);
                    break;
                case 'state':
                case 'snapshot':
                    this.handleStateMessage(message as StateMessage);
                    break;
                case 'ping':
                    this.handlePing(message as PingPongMessage);
                    break;
                case 'pong':
                    this.handlePong(message as PingPongMessage);
                    break;
            }
        } catch (error) {
            console.error('[WebRTCSync] Parse error:', error);
        }
    }

    private handleSeedMessage(message: SeedMessage): void {
        console.log(`[WebRTCSync] Received seed: ${message.seed}`);
        this.seedCallback?.(message.seed);
    }

    private handleInputMessage(message: InputMessage): void {
        if (!this.coopGame) return;

        // Sequence check
        if (message.sequenceNumber && message.sequenceNumber <= this.remoteSequence) {
            return; // Ignore old/duplicate
        }
        this.remoteSequence = message.sequenceNumber || this.remoteSequence;

        // Apply to the other player
        const otherPlayer: 1 | 2 = this.playerNumber === 1 ? 2 : 1;
        if (message.playerNumber === otherPlayer) {
            this.coopGame.controller.handleAction(otherPlayer, message.action);
        }
    }

    private handleStateMessage(message: StateMessage): void {
        if (!this.coopGame) return;

        // Sequence check
        if (message.sequenceNumber && message.sequenceNumber <= this.remoteSequence) {
            return;
        }
        this.remoteSequence = message.sequenceNumber || this.remoteSequence;

        // Apply remote state (similar to CoopSync.applyRemoteState)
        this.applyRemoteState(message.state, message.type === 'snapshot');
    }

    private applyRemoteState(remoteState: any, isSnapshot: boolean): void {
        if (!this.coopGame || !remoteState) return;

        // Board sync
        if (remoteState.board) {
            this.coopGame.board.grid = remoteState.board;
        }

        // Score sync
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

        // Pause sync
        if (typeof remoteState.isPaused === 'boolean') {
            if (this.coopGame.isPaused !== remoteState.isPaused) {
                this.coopGame.isPaused = remoteState.isPaused;
                if (!this.coopGame.isPaused) {
                    (this.coopGame as any).lastUpdate = performance.now();
                }
            }
        }

        // Next pieces sync
        if (remoteState.nextPieces) {
            if (this.playerNumber === 2 || isSnapshot) {
                this.coopGame.controller.setNextPiece(1, remoteState.nextPieces.player1);
                this.coopGame.controller.setNextPiece(2, remoteState.nextPieces.player2);
            }
        }

        // Other player piece sync
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

    sendPing(): void {
        if (!this.isReady()) return;

        this.lastPingTime = Date.now();
        const message: PingPongMessage = {
            type: 'ping',
            timestamp: this.lastPingTime
        };
        this.sendMessage(message);
    }

    private handlePing(message: PingPongMessage): void {
        // Echo back pong
        const pong: PingPongMessage = {
            type: 'pong',
            timestamp: message.timestamp
        };
        this.sendMessage(pong);
    }

    private handlePong(message: PingPongMessage): void {
        const rtt = Date.now() - message.timestamp;
        this.latency = Math.ceil(rtt / 2);
    }

    // ========== Test Helpers ==========

    /** @internal For testing only */
    simulateConnected(): void {
        this.setConnectionState('connected');
    }

    /** @internal For testing only */
    simulateDataChannelReady(): void {
        // Create a mock-like data channel for testing
        if (!this.dataChannel) {
            this.dataChannel = {
                readyState: 'open',
                send: (data: string) => {
                    this.sentMessages.push(JSON.parse(data));
                },
                close: () => { }
            } as unknown as RTCDataChannel;
        }
        (this.dataChannel as any).readyState = 'open';
        this.setConnectionState('connected');
    }

    /** @internal For testing only */
    simulateReceiveMessage(message: WebRTCMessage): void {
        this.handleMessage(JSON.stringify(message));
    }

    /** @internal For testing only */
    getSentMessageCount(): number {
        return this.sentMessages.length;
    }

    // ========== Cleanup ==========

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

        this.iceCandidates = [];
        this.pendingInputs = [];
        this.sentMessages = [];
        this.localSequence = 0;
        this.remoteSequence = 0;
        this.latency = 0;

        this.setConnectionState('disconnected');
    }
}
