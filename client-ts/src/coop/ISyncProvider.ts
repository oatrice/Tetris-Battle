/**
 * ISyncProvider.ts
 * Interface for synchronization providers (Firebase, WebRTC, etc.)
 */

import { RoomInfo } from './RoomManager';
import type { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';

/**
 * Connection state for sync providers
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * Signaling data for WebRTC connection establishment
 */
export interface SignalingData {
    type: 'offer' | 'answer' | 'ice-candidate';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
}

/**
 * Interface for Coop game synchronization providers
 */
export interface ISyncProvider {
    /** Current connection latency in milliseconds */
    latency: number;

    /** Current connection state */
    readonly connectionState: ConnectionState;

    /**
     * Start syncing with the specified room
     * @param room - Room information
     * @param game - CoopGame instance to sync
     * @param playerNumber - Which player this client is (1 or 2)
     */
    start(room: RoomInfo, game: CoopGame, playerNumber: 1 | 2): void;

    /**
     * Stop syncing and cleanup resources
     */
    stop(): void;

    /**
     * Send a player input action to the peer
     * @param action - The action to send
     */
    sendInput(action: PlayerAction): Promise<void>;

    /**
     * Broadcast a full state snapshot (e.g., on piece lock)
     */
    sendLockSnapshot(): Promise<void>;

    /**
     * Broadcast the random seed (Host only)
     * @param seed - The seed to broadcast
     */
    broadcastSeed(seed: number): Promise<void>;

    /**
     * Wait for the random seed from the host (Guest only)
     * @param callback - Called when seed is received
     */
    waitForSeed(callback: (seed: number) => void): void;
}

/**
 * Interface for manual signaling (QR/Copy-Paste)
 */
export interface IManualSignaling {
    /**
     * Generate an offer and return it as a string (for QR/Copy)
     */
    createOffer(): Promise<string>;

    /**
     * Accept an offer and generate an answer
     * @param offerString - The offer string from the host
     */
    acceptOffer(offerString: string): Promise<string>;

    /**
     * Complete connection by accepting the answer
     * @param answerString - The answer string from the guest
     */
    acceptAnswer(answerString: string): Promise<void>;

    /**
     * Event callback when connection state changes
     */
    onConnectionStateChange?: (state: ConnectionState) => void;
}
