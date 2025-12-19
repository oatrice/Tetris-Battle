/**
 * WebRTCSync.test.ts
 * TDD Tests for WebRTC P2P Synchronization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCSync } from './WebRTCSync';
import { ConnectionState } from './ISyncProvider';

// Mock RTCPeerConnection
class MockRTCPeerConnection {
    localDescription: RTCSessionDescription | null = null;
    remoteDescription: RTCSessionDescription | null = null;
    connectionState: RTCPeerConnectionState = 'new';
    iceConnectionState: RTCIceConnectionState = 'new';
    iceGatheringState: RTCIceGatheringState = 'new';

    private dataChannels: Map<string, MockRTCDataChannel> = new Map();
    private iceCandidates: RTCIceCandidate[] = [];

    onconnectionstatechange: ((ev: Event) => void) | null = null;
    onicecandidate: ((ev: RTCPeerConnectionIceEvent) => void) | null = null;
    ondatachannel: ((ev: RTCDataChannelEvent) => void) | null = null;

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        return {
            type: 'offer',
            sdp: 'mock-offer-sdp-' + Math.random().toString(36).substring(7)
        };
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        return {
            type: 'answer',
            sdp: 'mock-answer-sdp-' + Math.random().toString(36).substring(7)
        };
    }

    async setLocalDescription(desc: RTCSessionDescriptionInit): Promise<void> {
        this.localDescription = new RTCSessionDescription(desc);
        // Simulate ICE gathering complete
        setTimeout(() => {
            this.iceGatheringState = 'complete';
            if (this.onicecandidate) {
                this.onicecandidate({ candidate: null } as RTCPeerConnectionIceEvent);
            }
        }, 10);
    }

    async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
        this.remoteDescription = new RTCSessionDescription(desc);
    }

    createDataChannel(label: string): MockRTCDataChannel {
        const channel = new MockRTCDataChannel(label);
        this.dataChannels.set(label, channel);
        return channel;
    }

    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        this.iceCandidates.push(candidate as RTCIceCandidate);
    }

    close(): void {
        this.connectionState = 'closed';
        this.dataChannels.forEach(ch => ch.close());
    }

    // Test helper: simulate connection established
    simulateConnected(): void {
        this.connectionState = 'connected';
        this.iceConnectionState = 'connected';
        if (this.onconnectionstatechange) {
            this.onconnectionstatechange(new Event('connectionstatechange'));
        }
    }

    // Test helper: simulate receiving data channel
    simulateDataChannel(label: string): MockRTCDataChannel {
        const channel = new MockRTCDataChannel(label);
        if (this.ondatachannel) {
            this.ondatachannel({ channel } as unknown as RTCDataChannelEvent);
        }
        return channel;
    }
}

class MockRTCDataChannel {
    label: string;
    readyState: RTCDataChannelState = 'connecting';

    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;

    private sentMessages: string[] = [];

    constructor(label: string) {
        this.label = label;
    }

    send(data: string): void {
        if (this.readyState !== 'open') {
            throw new Error('DataChannel is not open');
        }
        this.sentMessages.push(data);
    }

    close(): void {
        this.readyState = 'closed';
        if (this.onclose) {
            this.onclose(new Event('close'));
        }
    }

    // Test helpers
    simulateOpen(): void {
        this.readyState = 'open';
        if (this.onopen) {
            this.onopen(new Event('open'));
        }
    }

    simulateMessage(data: string): void {
        if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data }));
        }
    }

    getSentMessages(): string[] {
        return this.sentMessages;
    }
}

// Mock RTCSessionDescription
class MockRTCSessionDescription implements RTCSessionDescription {
    type: RTCSdpType;
    sdp: string;

    constructor(init: RTCSessionDescriptionInit) {
        this.type = init.type!;
        this.sdp = init.sdp || '';
    }

    toJSON(): RTCSessionDescriptionInit {
        return { type: this.type, sdp: this.sdp };
    }
}

// Setup global mocks
vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);
vi.stubGlobal('RTCSessionDescription', MockRTCSessionDescription);

describe('WebRTCSync', () => {
    let webrtcSync: WebRTCSync;

    beforeEach(() => {
        webrtcSync = new WebRTCSync();
    });

    afterEach(() => {
        webrtcSync.stop();
    });

    describe('Manual Signaling - Offer/Answer', () => {
        it('should create an offer string for QR/Copy', async () => {
            const offerString = await webrtcSync.createOffer();

            expect(offerString).toBeDefined();
            expect(typeof offerString).toBe('string');
            expect(offerString.length).toBeGreaterThan(0);

            // Should be valid JSON
            const parsed = JSON.parse(offerString);
            expect(parsed.type).toBe('offer');
            expect(parsed.sdp).toBeDefined();
        });

        it('should accept an offer and generate an answer', async () => {
            // Create offer from "remote" peer
            const remotePeer = new WebRTCSync();
            const offerString = await remotePeer.createOffer();

            // Accept offer and get answer
            const answerString = await webrtcSync.acceptOffer(offerString);

            expect(answerString).toBeDefined();
            expect(typeof answerString).toBe('string');

            const parsed = JSON.parse(answerString);
            expect(parsed.type).toBe('answer');
            expect(parsed.sdp).toBeDefined();

            remotePeer.stop();
        });

        it('should complete connection after accepting answer', async () => {
            // Simulate two peers
            const hostPeer = new WebRTCSync();
            const guestPeer = new WebRTCSync();

            // Host creates offer
            const offerString = await hostPeer.createOffer();

            // Guest accepts offer and creates answer
            const answerString = await guestPeer.acceptOffer(offerString);

            // Host accepts answer
            await hostPeer.acceptAnswer(answerString);

            // Both should have remote descriptions set
            expect(hostPeer.connectionState).not.toBe('failed');
            expect(guestPeer.connectionState).not.toBe('failed');

            hostPeer.stop();
            guestPeer.stop();
        });

        it('should reject invalid offer string', async () => {
            await expect(webrtcSync.acceptOffer('invalid-json')).rejects.toThrow();
            await expect(webrtcSync.acceptOffer('{"invalid": true}')).rejects.toThrow();
        });

        it('should reject invalid answer string', async () => {
            await webrtcSync.createOffer();
            await expect(webrtcSync.acceptAnswer('invalid-json')).rejects.toThrow();
        });
    });

    describe('Connection State', () => {
        it('should start with disconnected state', () => {
            expect(webrtcSync.connectionState).toBe('disconnected');
        });

        it('should transition to connecting when creating offer', async () => {
            await webrtcSync.createOffer();
            expect(webrtcSync.connectionState).toBe('connecting');
        });

        it('should notify on connection state change', async () => {
            const stateChanges: ConnectionState[] = [];
            webrtcSync.onConnectionStateChange = (state: ConnectionState) => {
                stateChanges.push(state);
            };

            await webrtcSync.createOffer();

            expect(stateChanges).toContain('connecting');
        });
    });

    describe('Data Channel Communication', () => {
        it('should send data after connection established', async () => {
            // Setup connection
            const hostPeer = new WebRTCSync();
            const guestPeer = new WebRTCSync();

            const offerString = await hostPeer.createOffer();
            const answerString = await guestPeer.acceptOffer(offerString);
            await hostPeer.acceptAnswer(answerString);

            // Simulate data channel ready (which also sets connection state)
            (hostPeer as any).simulateDataChannelReady();
            (guestPeer as any).simulateDataChannelReady();

            // Both should be ready to send
            expect(hostPeer.isReady()).toBe(true);
            expect(guestPeer.isReady()).toBe(true);

            hostPeer.stop();
            guestPeer.stop();
        });
    });

    describe('Seed Broadcasting', () => {
        it('should broadcast seed to peer', async () => {
            const hostPeer = new WebRTCSync();
            const guestPeer = new WebRTCSync();

            // Setup mock connection
            const offerString = await hostPeer.createOffer();
            const answerString = await guestPeer.acceptOffer(offerString);
            await hostPeer.acceptAnswer(answerString);

            // Mock data channels
            (hostPeer as any).simulateDataChannelReady();
            (guestPeer as any).simulateDataChannelReady();

            let receivedSeed: number | null = null;
            guestPeer.waitForSeed((seed: number) => {
                receivedSeed = seed;
            });

            await hostPeer.broadcastSeed(12345);

            // Simulate message delivery
            (guestPeer as any).simulateReceiveMessage({
                type: 'seed',
                seed: 12345
            });

            expect(receivedSeed).toBe(12345);

            hostPeer.stop();
            guestPeer.stop();
        });
    });

    describe('Input Synchronization', () => {
        it('should queue inputs when not connected', async () => {
            // Not connected yet
            await webrtcSync.sendInput('moveLeft' as any);

            // Should not throw, just queue
            expect(webrtcSync.getPendingInputCount()).toBeGreaterThan(0);
        });

        it('should send inputs immediately when connected', async () => {
            const hostPeer = new WebRTCSync();

            // Mock full connection
            await hostPeer.createOffer();
            (hostPeer as any).simulateDataChannelReady();

            const sentCount = (hostPeer as any).getSentMessageCount();
            await hostPeer.sendInput('moveLeft' as any);

            expect((hostPeer as any).getSentMessageCount()).toBe(sentCount + 1);

            hostPeer.stop();
        });
    });

    describe('Latency Measurement', () => {
        it('should measure latency via ping/pong', async () => {
            const hostPeer = new WebRTCSync();

            (hostPeer as any).simulateDataChannelReady();

            // Simulate ping sent
            (hostPeer as any).sendPing();

            // Simulate pong received after 50ms
            setTimeout(() => {
                (hostPeer as any).simulateReceiveMessage({
                    type: 'pong',
                    timestamp: Date.now() - 50
                });
            }, 50);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(hostPeer.latency).toBeGreaterThan(0);

            hostPeer.stop();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup resources on stop', async () => {
            await webrtcSync.createOffer();
            webrtcSync.stop();

            expect(webrtcSync.connectionState).toBe('disconnected');
            expect(webrtcSync.isReady()).toBe(false);
        });
    });
});
