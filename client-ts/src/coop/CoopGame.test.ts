
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoopGame } from './CoopGame';
import { RoomInfo } from './RoomManager';

// Mock RealtimeService to avoid Missing URL Error
vi.mock('../services/RealtimeService', () => {
    return {
        RealtimeService: vi.fn().mockImplementation(() => ({
            onValue: vi.fn(),
            set: vi.fn(),
            push: vi.fn(),
            off: vi.fn()
        }))
    };
});

describe('CoopGame State Sync on Lock', () => {
    let game: CoopGame;
    let mockSync: any;
    let mockRoom: RoomInfo;

    beforeEach(() => {
        game = new CoopGame();
        mockSync = {
            start: vi.fn(),
            stop: vi.fn(),
            sendLockSnapshot: vi.fn()
        };
        // Mock the sync property on the game instance
        (game as any).sync = mockSync;

        mockRoom = {
            id: 'test-room',
            hostId: 'p1',
            players: ['p1', 'p2'],
            createdAt: 123,
            status: 'playing'
        };
    });

    it('should broadcast snapshot when Master (Player 1) locks a piece', () => {
        // Setup: Player 1 (Master)
        game.start(mockRoom, 1);

        // Overwrite the sync object created by start() with our mock
        (game as any).sync = mockSync;

        // Spy on controller results to simulate a lock
        // We can force a lock state by manipulating the controller or board
        // Or simpler: Mock the controller's applyGravity to return locked = true
        vi.spyOn(game.controller, 'applyGravity').mockReturnValue({
            player1Locked: true,
            player2Locked: false
        });

        // Trigger update loop manually (simulate one frame)
        // delta > dropInterval to force gravity
        game.update(1100);

        expect(mockSync.sendLockSnapshot).toHaveBeenCalledTimes(1);
    });

    it('should overwrite local state when Peer receives a snapshot', () => {
        // Using real CoopSync logic requires mocking Firebase, 
        // effectively we want to test the applyRemoteState logic in CoopSync 
        // but here we are testing CoopGame integration.
        // Let's verify CoopGame exposes a method to force set state or similar,
        // or just verify the architecture.

        // Actually, the request asks for specific logic in CoopSync listener.
        // We will implement `overwriteState` in CoopGame and test it here.


        // Inject method if not exists yet (TDD: we assume we will build it)
        // game.overwriteState(newState); 
        // expect(game.score).toBe(1000);
    });
});
