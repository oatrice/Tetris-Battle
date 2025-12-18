import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Leaderboard } from './Leaderboard';
import { AuthService } from '../services/AuthService';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn().mockReturnValue({}),
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn()
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

    it('should fetch online scores correctly', async () => {
        const mockDocs = [
            { data: () => ({ name: 'P1', score: 1000, timestamp: 123, userId: 'u1' }) },
            { data: () => ({ name: 'P2', score: 800, timestamp: 124, userId: 'u2' }) }
        ];

        // Mock getDocs return value
        const getDocsMock = getDocs as any;
        getDocsMock.mockResolvedValue({
            forEach: (callback: any) => mockDocs.forEach(callback)
        });

        // Inject mock auth (needed for getApp check usually, though reading public leaderboard might not need auth user, but needs app ref)
        leaderboard.setAuthService(mockAuthService);

        const scores = await leaderboard.getOnlineScores();

        expect(query).toHaveBeenCalled();
        expect(getDocs).toHaveBeenCalled();
        expect(scores).toHaveLength(2);
        expect(scores[0].name).toBe('P1');
    });
});
