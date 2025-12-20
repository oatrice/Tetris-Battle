/**
 * FirebaseSignaling.ts
 * Firebase Realtime Database based WebRTC Signaling
 * Used for exchanging Offer/Answer/ICE candidates before establishing P2P connection
 */

import { RealtimeService } from '../services/RealtimeService';

/**
 * Firebase-based signaling for WebRTC connection establishment
 */
export class FirebaseSignaling {
    private realtime = new RealtimeService();
    private signalingPath: string;

    // Callbacks
    private offerCallback?: (offer: RTCSessionDescriptionInit) => void;
    private answerCallback?: (answer: RTCSessionDescriptionInit) => void;
    private iceCandidateCallback?: (candidate: RTCIceCandidateInit) => void;
    private connectionReadyCallback?: () => void;
    private peerReadyCallback?: () => void;

    // Unsubscribe functions
    private unsubscribeOffer?: () => void;
    private unsubscribeAnswer?: () => void;
    private unsubscribeIce?: () => void;
    private unsubscribePeerReady?: () => void;

    // Track processed ICE candidates to avoid duplicates
    private processedIceCandidates = new Set<string>();

    constructor(roomId: string) {
        this.signalingPath = `webrtc/signaling/${roomId}`;
        this.setupListeners();
    }

    /**
     * Setup Firebase listeners for signaling
     */
    private setupListeners(): void {
        // Listen for offer
        this.unsubscribeOffer = this.realtime.onValue<RTCSessionDescriptionInit>(
            `${this.signalingPath}/offer`,
            (offer) => {
                if (offer && this.offerCallback) {
                    this.offerCallback(offer);
                }
            }
        );

        // Listen for answer
        this.unsubscribeAnswer = this.realtime.onValue<RTCSessionDescriptionInit>(
            `${this.signalingPath}/answer`,
            (answer) => {
                if (answer && this.answerCallback) {
                    this.answerCallback(answer);
                }
            }
        );

        // Listen for ICE candidates
        this.unsubscribeIce = this.realtime.onValue<RTCIceCandidateInit[]>(
            `${this.signalingPath}/ice`,
            (candidates) => {
                if (candidates && this.iceCandidateCallback) {
                    // Handle both single candidate and array
                    const candidateArray = Array.isArray(candidates) ? candidates : [candidates];

                    candidateArray.forEach(candidate => {
                        if (candidate && candidate.candidate) {
                            // Create unique key to avoid duplicates
                            const key = `${candidate.candidate}:${candidate.sdpMLineIndex}`;

                            if (!this.processedIceCandidates.has(key)) {
                                this.processedIceCandidates.add(key);
                                this.iceCandidateCallback!(candidate);
                            }
                        }
                    });
                }
            }
        );

        // Listen for peer ready signal
        this.unsubscribePeerReady = this.realtime.onValue<boolean>(
            `${this.signalingPath}/peerReady`,
            (ready) => {
                if (ready && this.peerReadyCallback) {
                    this.peerReadyCallback();
                }
            }
        );
    }

    /**
     * Send offer to Firebase
     */
    async sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        await this.realtime.set(`${this.signalingPath}/offer`, {
            type: offer.type,
            sdp: offer.sdp
        });
        console.log('[FirebaseSignaling] Offer sent');
    }

    /**
     * Send answer to Firebase
     */
    async sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        await this.realtime.set(`${this.signalingPath}/answer`, {
            type: answer.type,
            sdp: answer.sdp
        });
        console.log('[FirebaseSignaling] Answer sent');
    }

    /**
     * Send ICE candidate to Firebase
     */
    async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        // Get existing candidates
        const existing = await this.realtime.get<RTCIceCandidateInit[]>(`${this.signalingPath}/ice`) || [];

        // Add new candidate
        const updated = [...existing, {
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid
        }];

        await this.realtime.set(`${this.signalingPath}/ice`, updated);
        console.log('[FirebaseSignaling] ICE candidate sent');
    }

    /**
     * Signal that this peer is ready for connection
     */
    async signalReady(): Promise<void> {
        await this.realtime.set(`${this.signalingPath}/ready`, true);
        console.log('[FirebaseSignaling] Ready signal sent');

        // Notify local callback
        if (this.connectionReadyCallback) {
            this.connectionReadyCallback();
        }
    }

    /**
     * Register callback for receiving offer
     */
    onOffer(callback: (offer: RTCSessionDescriptionInit) => void): void {
        this.offerCallback = callback;
    }

    /**
     * Register callback for receiving answer
     */
    onAnswer(callback: (answer: RTCSessionDescriptionInit) => void): void {
        this.answerCallback = callback;
    }

    /**
     * Register callback for receiving ICE candidates
     */
    onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
        this.iceCandidateCallback = callback;
    }

    /**
     * Register callback for when connection is ready
     */
    onConnectionReady(callback: () => void): void {
        this.connectionReadyCallback = callback;
    }

    /**
     * Register callback for when peer is ready
     */
    onPeerReady(callback: () => void): void {
        this.peerReadyCallback = callback;
    }

    /**
     * Cleanup signaling data and unsubscribe from listeners
     */
    cleanup(): void {
        console.log('[FirebaseSignaling] Cleaning up...');

        // Unsubscribe from all listeners
        if (this.unsubscribeOffer) this.unsubscribeOffer();
        if (this.unsubscribeAnswer) this.unsubscribeAnswer();
        if (this.unsubscribeIce) this.unsubscribeIce();
        if (this.unsubscribePeerReady) this.unsubscribePeerReady();

        // Remove signaling data from Firebase
        this.realtime.remove(this.signalingPath).catch(err => {
            console.error('[FirebaseSignaling] Error removing signaling data:', err);
        });

        // Clear callbacks
        this.offerCallback = undefined;
        this.answerCallback = undefined;
        this.iceCandidateCallback = undefined;
        this.connectionReadyCallback = undefined;
        this.peerReadyCallback = undefined;

        // Clear processed candidates
        this.processedIceCandidates.clear();
    }
}
