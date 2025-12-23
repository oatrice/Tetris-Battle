
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoopSync } from './CoopSync';
import { CoopGame } from './CoopGame';
import { PlayerAction } from './DualPiece';

// Mock RealtimeService
const mockPush = vi.fn();
const mockOnValue = vi.fn();

vi.mock('../services/RealtimeService', () => {
    return {
        RealtimeService: vi.fn().mockImplementation(() => ({
            push: mockPush,
            onValue: mockOnValue,
            set: vi.fn(),
            remove: vi.fn(),
        }))
    };
});

describe('CoopSync - Input Synchronization', () => {
    let sync: CoopSync;
    let mockGame: CoopGame;

    beforeEach(() => {
        vi.clearAllMocks();
        sync = new CoopSync();
        mockGame = {
            controller: {
                handleAction: vi.fn(),
                getPiece: vi.fn(),
                getPosition: vi.fn(),
                getNextPiece: vi.fn(),
            },
            board: { grid: [] },
            getState: vi.fn().mockReturnValue({
                board: { grid: [] },
                nextPieces: { player1: {}, player2: {} },
                player1: {},
                player2: {},
                score: 0,
                lines: 0,
                level: 1,
                isPaused: false,
                gameOver: false
            }),
            room: { id: 'test-room' }
        } as unknown as CoopGame;

        // Mock getLocalPlayerId via sessionStorage
        sessionStorage.setItem('coopPlayerId', 'player1-uid');
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('should send input packet when sendInput is called', async () => {
        const room = { id: 'room_123' } as unknown as any;
        // @ts-ignore
        mockGame.room = room;
        sync.start(room, mockGame, 1);

        // Act: Send an input
        await sync.sendInput(PlayerAction.MOVE_LEFT);

        // Assert: sending to correct path
        expect(mockPush).toHaveBeenCalledWith(
            'tetrisCoop/inputs/room_123',
            expect.objectContaining({
                action: PlayerAction.MOVE_LEFT,
                playerNumber: 1,
                playerId: 'player1-uid'
            })
        );
    });

    it('should apply input packet locally when received from remote', () => {
        const room = { id: 'room_123' } as unknown as any;
        sync.start(room, mockGame, 1); // We are Player 1

        // Extract the callback passed to onValue
        // The first call to onValue is for state sync (existing code)
        // We expect a second call for input sync or we check which path was subscribed
        const inputCallback = mockOnValue.mock.calls.find(call => call[0].includes('inputs'))?.[1];

        expect(inputCallback).toBeDefined();

        // Simulate receiving input from Player 2
        // In our implementation, we expect a dictionary of packets
        const inputPacket = {
            input_Key_1: {
                action: PlayerAction.ROTATE,
                playerNumber: 2,
                playerId: 'player2-others',
                timestamp: Date.now() + 100
            }
        };

        // Act
        inputCallback(inputPacket);

        // Assert: Game controller should handle the action for Player 2
        expect(mockGame.controller.handleAction).toHaveBeenCalledWith(2, PlayerAction.ROTATE);
    });

    it('should ignore inputs from self', () => {
        const room = { id: 'room_123' } as unknown as any;
        sync.start(room, mockGame, 1);

        const inputCallback = mockOnValue.mock.calls.find(call => call[0].includes('inputs'))?.[1];

        // Simulate receiving input from Self (Player 1)
        const inputPacket = {
            input_Key_1: {
                action: PlayerAction.ROTATE,
                playerNumber: 1,
                playerId: 'player1-uid',
                timestamp: Date.now() + 100
            }
        };

        inputCallback(inputPacket);

        // Assert: Should NOT call handleAction
        expect(mockGame.controller.handleAction).not.toHaveBeenCalled();
    });
});

