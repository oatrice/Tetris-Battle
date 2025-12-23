
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoopSync } from './CoopSync';
import { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';

// Mock RealtimeService
const mockPush = vi.fn();
const mockOnValue = vi.fn().mockReturnValue(() => { }); // Return dummy unsubscribe
const mockSet = vi.fn();

vi.mock('../services/RealtimeService', () => {
    return {
        RealtimeService: vi.fn().mockImplementation(() => ({
            push: mockPush,
            onValue: mockOnValue,
            set: mockSet,
            remove: vi.fn(),
        }))
    };
});

describe('Phase 4: Sequence Numbers & Latency', () => {
    let sync: CoopSync;
    let mockGame: CoopGame;

    beforeEach(() => {
        vi.clearAllMocks();
        sync = new CoopSync();
        mockGame = {
            room: { id: 'room-1' },
            controller: {
                handleAction: vi.fn(),
            },
            getState: vi.fn().mockReturnValue({ board: {}, nextPieces: {}, player1: {}, player2: {} }),
            board: { grid: [] }, // Add proper board structure for direct assignment
        } as unknown as CoopGame;

        // Setup initial sync
        sync.start(mockGame.room!, mockGame, 1);

        // Helper to grab callbacks
        // Note: we might need to distinguish between inputs/state/heartbeat listeners
    });

    afterEach(() => {
        sync.stop();
    });

    it('should attach sequence numbers to outgoing inputs', async () => {
        await sync.sendInput(PlayerAction.MOVE_LEFT);
        await sync.sendInput(PlayerAction.MOVE_RIGHT);

        // Check first packet
        expect(mockPush).toHaveBeenNthCalledWith(1,
            expect.stringContaining('inputs'),
            expect.objectContaining({
                action: PlayerAction.MOVE_LEFT,
                sequenceNumber: 1
            })
        );

        // Check second packet (incremented)
        expect(mockPush).toHaveBeenNthCalledWith(2,
            expect.stringContaining('inputs'),
            expect.objectContaining({
                action: PlayerAction.MOVE_RIGHT,
                sequenceNumber: 2
            })
        );
    });

    it('should ignore incoming inputs with old sequence numbers', () => {
        // Find input callback
        const inputCallback = mockOnValue.mock.calls.find(c => c[0].includes('inputs'))?.[1];
        expect(inputCallback).toBeDefined();

        // 1. Process valid packet (Seq 10)
        inputCallback({
            pkt1: { playerNumber: 2, action: PlayerAction.ROTATE, sequenceNumber: 10, timestamp: Date.now() }
        });
        expect(mockGame.controller.handleAction).toHaveBeenCalledTimes(1);

        // 2. Process old packet (Seq 9) -> Should Ignore
        inputCallback({
            pkt2: { playerNumber: 2, action: PlayerAction.SOFT_DROP, sequenceNumber: 9, timestamp: Date.now() }
        });
        expect(mockGame.controller.handleAction).toHaveBeenCalledTimes(1); // Still 1

        // 3. Process new packet (Seq 11) -> Should Accept
        inputCallback({
            pkt3: { playerNumber: 2, action: PlayerAction.HOLD, sequenceNumber: 11, timestamp: Date.now() }
        });
        expect(mockGame.controller.handleAction).toHaveBeenCalledTimes(2);
    });

    it('should calculate ping latency correctly', () => {
        const myPongPath = 'tetrisCoop/heartbeat/room-1/1/pong';
        // Find the callback for myPongPath
        const pongCallback = mockOnValue.mock.calls.find(c => c[0] === myPongPath)?.[1];
        expect(pongCallback).toBeDefined();

        const start = Date.now();
        const rtt = 100;
        const sentTime = start - rtt;

        // Simulate receiving pong
        pongCallback(sentTime);

        // Verify latency updated
        // Calculated as ceil(RTT / 2)
        // RTT = (ActualNow - sentTime) approx 100ms
        const expectedLatency = Math.ceil(rtt / 2);

        // Allow variance due to test execution time
        expect(sync.latency).toBeGreaterThanOrEqual(expectedLatency);
        expect(sync.latency).toBeLessThan(expectedLatency + 50);
    });
    it('should sync pause state from remote', () => {
        // Find state callback
        const stateCallback = mockOnValue.mock.calls.find(c => c[0].includes('gameState'))?.[1];
        expect(stateCallback).toBeDefined();

        // Simulate Remote Pause
        stateCallback({
            playerId: 'other_player',
            state: {
                isPaused: true,
                board: [], // Minimal fields
            }
        });
        expect(mockGame.isPaused).toBe(true); // Should apply TRUE

        // Simulate Remote Resume
        stateCallback({
            playerId: 'other_player',
            state: {
                isPaused: false,
                board: [],
            }
        });
        expect(mockGame.isPaused).toBe(false); // Should apply FALSE
    });
});
