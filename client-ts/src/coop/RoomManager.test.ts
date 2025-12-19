import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomManager } from './RoomManager';

// Mock RealtimeService
const mockPush = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();
const mockOnValue = vi.fn();

vi.mock('../services/RealtimeService', () => {
    return {
        RealtimeService: vi.fn().mockImplementation(() => {
            return {
                push: mockPush,
                set: mockSet,
                update: mockUpdate,
                get: mockGet,
                onValue: mockOnValue,
            };
        }),
    };
});

describe('RoomManager', () => {
    let roomManager: RoomManager;

    beforeEach(() => {
        vi.clearAllMocks();
        roomManager = new RoomManager();
    });

    it('should create room with status waiting', async () => {
        // Mock push return
        mockPush.mockResolvedValue('room123');

        const room = await roomManager.createRoom('host1');

        expect(mockPush).toHaveBeenCalledWith('tetrisCoop/rooms', expect.objectContaining({
            hostId: 'host1',
            status: 'waiting',  // Verify status initialization
            players: ['host1']
        }));

        expect(room.id).toBe('room123');
        expect(room.status).toBe('waiting');
    });

    it('should update room status', async () => {
        await roomManager.updateStatus('room123', 'playing');

        expect(mockUpdate).toHaveBeenCalledWith('tetrisCoop/rooms/room123', {
            status: 'playing'
        });
    });
});
