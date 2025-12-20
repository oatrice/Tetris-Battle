/**
 * FirebaseSignaling.test.ts
 * TDD Tests for Firebase-based WebRTC Signaling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FirebaseSignaling } from './FirebaseSignaling';
import { RealtimeService } from '../services/RealtimeService';

// Mock RealtimeService
vi.mock('../services/RealtimeService', () => {
    const mockData: Record<string, any> = {};
    const mockListeners: Record<string, ((data: any) => void)[]> = {};

    return {
        RealtimeService: vi.fn().mockImplementation(() => ({
            set: vi.fn().mockImplementation(async (path: string, data: any) => {
                mockData[path] = data;
                // Trigger listeners asynchronously
                if (mockListeners[path]) {
                    setTimeout(() => {
                        mockListeners[path].forEach(cb => cb(data));
                    }, 10);
                }
            }),
            get: vi.fn().mockImplementation(async (path: string) => {
                return mockData[path] || null;
            }),
            onValue: vi.fn().mockImplementation((path: string, callback: (data: any) => void) => {
                if (!mockListeners[path]) mockListeners[path] = [];
                mockListeners[path].push(callback);

                // Immediately call with current value
                if (mockData[path]) callback(mockData[path]);

                // Return unsubscribe function
                return () => {
                    const index = mockListeners[path]?.indexOf(callback);
                    if (index !== undefined && index > -1) {
                        mockListeners[path].splice(index, 1);
                    }
                };
            }),
            remove: vi.fn().mockImplementation(async (path: string) => {
                delete mockData[path];
            }),
            // Test helpers
            _getMockData: () => mockData,
            _clearMockData: () => {
                Object.keys(mockData).forEach(key => delete mockData[key]);
                Object.keys(mockListeners).forEach(key => delete mockListeners[key]);
            }
        }))
    };
});

describe('FirebaseSignaling', () => {
    let signaling: FirebaseSignaling;
    const roomId = 'test-room-123';

    beforeEach(() => {
        // Cleanup old instance if exists
        if (signaling) {
            signaling.cleanup();
        }

        // Clear mock data first
        const mockService = new (vi.mocked(RealtimeService) as any)();
        mockService._clearMockData?.();

        // Then create fresh signaling instance
        signaling = new FirebaseSignaling(roomId);
    });

    afterEach(() => {
        if (signaling) {
            signaling.cleanup();
        }
    });

    describe('Offer/Answer Exchange', () => {
        it('should send offer to Firebase', async () => {
            const offer = { type: 'offer' as RTCSdpType, sdp: 'test-offer-sdp' };

            await signaling.sendOffer(offer);

            const realtime = (signaling as any).realtime;
            const data = realtime._getMockData();
            const offerPath = `webrtc/signaling/${roomId}/offer`;

            expect(data[offerPath]).toBeDefined();
            expect(data[offerPath].sdp).toBe('test-offer-sdp');
        });

        it('should receive offer from Firebase', async () => {
            const mockOffer = { type: 'offer' as RTCSdpType, sdp: 'remote-offer-sdp' };
            let receivedOffer: RTCSessionDescriptionInit | null = null;

            signaling.onOffer((offer: RTCSessionDescriptionInit) => {
                receivedOffer = offer;
            });

            // Simulate remote peer sending offer
            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/offer`, mockOffer);

            // Wait for async callback
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedOffer).toBeDefined();
            expect((receivedOffer as unknown as RTCSessionDescriptionInit).sdp).toBe('remote-offer-sdp');
        });

        it('should send answer to Firebase', async () => {
            const answer = { type: 'answer' as RTCSdpType, sdp: 'test-answer-sdp' };

            await signaling.sendAnswer(answer);

            const realtime = (signaling as any).realtime;
            const data = realtime._getMockData();
            const answerPath = `webrtc/signaling/${roomId}/answer`;

            expect(data[answerPath]).toBeDefined();
            expect(data[answerPath].sdp).toBe('test-answer-sdp');
        });

        it('should receive answer from Firebase', async () => {
            const mockAnswer = { type: 'answer' as RTCSdpType, sdp: 'remote-answer-sdp' };
            let receivedAnswer: RTCSessionDescriptionInit | null = null;

            signaling.onAnswer((answer: RTCSessionDescriptionInit) => {
                receivedAnswer = answer;
            });

            // Simulate remote peer sending answer
            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/answer`, mockAnswer);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedAnswer).toBeDefined();
            expect((receivedAnswer as unknown as RTCSessionDescriptionInit).sdp).toBe('remote-answer-sdp');
        });
    });

    describe('ICE Candidate Exchange', () => {
        it('should send ICE candidate to Firebase', async () => {
            const candidate: RTCIceCandidateInit = {
                candidate: 'test-candidate-string',
                sdpMLineIndex: 0,
                sdpMid: 'audio'
            };

            await signaling.sendIceCandidate(candidate);

            const realtime = (signaling as any).realtime;
            const data = realtime._getMockData();

            // Check that candidate was pushed to array
            const icePath = `webrtc/signaling/${roomId}/ice`;
            expect(data[icePath]).toBeDefined();
        });

        it.skip('should receive ICE candidates from Firebase', async () => {
            const mockCandidate: RTCIceCandidateInit = {
                candidate: 'remote-candidate',
                sdpMLineIndex: 0
            };
            const receivedCandidates: RTCIceCandidateInit[] = [];

            signaling.onIceCandidate((candidate) => {
                receivedCandidates.push(candidate);
            });

            // Simulate remote peer sending ICE candidate
            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/ice`, [mockCandidate]);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedCandidates.length).toBeGreaterThan(0);
            expect(receivedCandidates[0].candidate).toBe('remote-candidate');
        });

        it.skip('should handle multiple ICE candidates', async () => {
            const candidates = [
                { candidate: 'candidate1', sdpMLineIndex: 0 },
                { candidate: 'candidate2', sdpMLineIndex: 1 }
            ];
            const receivedCandidates: RTCIceCandidateInit[] = [];

            signaling.onIceCandidate((candidate) => {
                receivedCandidates.push(candidate);
            });

            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/ice`, candidates);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(receivedCandidates.length).toBe(2);
        });
    });

    describe('Cleanup', () => {
        it('should remove signaling data on cleanup', async () => {
            const offer = { type: 'offer' as RTCSdpType, sdp: 'test-sdp' };
            await signaling.sendOffer(offer);

            signaling.cleanup();

            const realtime = (signaling as any).realtime;
            const removeSpy = realtime.remove;

            // Should call remove for signaling path
            expect(removeSpy).toHaveBeenCalled();
        });

        it('should unsubscribe from listeners on cleanup', async () => {
            let offerCallbackCalled = false;
            signaling.onOffer(() => {
                offerCallbackCalled = true;
            });

            signaling.cleanup();

            // Try to trigger callback after cleanup
            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/offer`, { type: 'offer', sdp: 'test' });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Callback should NOT have been called after cleanup
            expect(offerCallbackCalled).toBe(false);
        });
    });

    describe('Connection Ready Signal', () => {
        it('should signal when connection is ready', async () => {
            let readyCallbackCalled = false;

            signaling.onConnectionReady(() => {
                readyCallbackCalled = true;
            });

            await signaling.signalReady();

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(readyCallbackCalled).toBe(true);
        });

        it('should wait for peer ready signal', async () => {
            let peerReadyCalled = false;

            signaling.onPeerReady(() => {
                peerReadyCalled = true;
            });

            // Simulate peer signaling ready
            const realtime = (signaling as any).realtime;
            await realtime.set(`webrtc/signaling/${roomId}/peerReady`, true);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(peerReadyCalled).toBe(true);
        });
    });
});
