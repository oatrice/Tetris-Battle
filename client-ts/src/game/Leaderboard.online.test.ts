import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Leaderboard } from './Leaderboard';
import { AuthService } from '../services/AuthService';
import { collection, addDoc } from 'firebase/firestore';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn().mockReturnValue({}),
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn()
}));

describe('Leaderboard Online', () => {
    let leaderboard: Leaderboard;
    let mockAuthService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        leaderboard = new Leaderboard();

        // Setup Mock Auth Service
        mockAuthService = {
            getUser: vi.fn().mockReturnValue({ uid: 'test-uid', displayName: 'TestUser' }),
            getApp: vi.fn().mockReturnValue({})
        } as unknown as AuthService;
    });

    it('should save score to firestore when user is authenticated', async () => {
        // We need to inject AuthService. 
        // Assuming we add a method setAuthService
        leaderboard.setAuthService(mockAuthService);

        const score = 1000;
        await leaderboard.addScore('TestUser', score);

        expect(addDoc).toHaveBeenCalled();
        const collectionMock = collection as any;
        expect(collectionMock).toHaveBeenCalledWith(expect.anything(), 'leaderboard');
    });

    it('should NOT save score to firestore when user is NOT authenticated', async () => {
        mockAuthService.getUser.mockReturnValue(null);
        leaderboard.setAuthService(mockAuthService);

        await leaderboard.addScore('Guest', 500);

        expect(addDoc).not.toHaveBeenCalled();
    });
});
