import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Leaderboard } from './Leaderboard';
import { GameMode } from './GameMode';
import { addDoc } from 'firebase/firestore';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn().mockReturnValue({}),
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn()
}));

// Mock AuthService
vi.mock('../services/AuthService', () => {
    return {
        AuthService: vi.fn().mockImplementation(() => ({
            getAuth: vi.fn(),
            getUser: vi.fn().mockReturnValue(null),
            getApp: vi.fn().mockReturnValue({})
        }))
    };
});

describe('DualScore System', () => {
    let leaderboard: Leaderboard;
    let mockAuthService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        leaderboard = new Leaderboard();

        // Setup default mock auth (Offline/Guest)
        mockAuthService = {
            getUser: vi.fn().mockReturnValue(null),
            getApp: vi.fn().mockReturnValue({})
        };
        leaderboard.setAuthService(mockAuthService);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    // 1. Score Merge Logic
    // Requirement: Offline score (e.g., 6000) should be synced/uploaded when user logs in.
    it('Score Merge Logic: should sync offline high scores to online upon user login', async () => {
        // 1. Play Offline - Score 6000
        mockAuthService.getUser.mockReturnValue(null);
        await leaderboard.addScore('Guest', 6000, GameMode.OFFLINE);

        // Verify Local has it
        const localScores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(localScores[0].score).toBe(6000);
        expect(addDoc).not.toHaveBeenCalled(); // No online upload yet

        // 2. User Logs In
        mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'PlayerOne' });

        // 3. Trigger Merge
        // Note: The UI usually calls this. We call it manually as the test target.
        // We expect mergeLocalScoresToUser to NOT ONLY update local userId, but ALSO upload the score if it's high enough.
        // Or we might need a separate 'syncLocalScoresToOnline' method if merge doesn't do it. 
        // Based on "Red-Green", we expect current implementation to FAIL uploading.
        await leaderboard.mergeLocalScoresToUser('u1', null);

        // Verify it TRIED to upload the offline score to Firestore
        // Verify it TRIED to upload the offline score to Firestore
        expect(addDoc).toHaveBeenCalled();
        const calls = (addDoc as any).mock.calls;
        // console.log('addDoc calls:', JSON.stringify(calls, null, 2));

        // Check if ANY call matches
        const hasMatch = calls.some((args: any[]) =>
            args[1].score === 6000 && args[1].userId === 'u1'
        );
        expect(hasMatch).toBe(true);
    });

    // 2. Network Resilience
    it('Network Resilience: persists to local storage even if Firestore fails (500/Timeout)', async () => {
        // Setup: Online User
        mockAuthService.getUser.mockReturnValue({ uid: 'u1' });

        // Mock Firestore Failure
        vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore 500 Error'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Act
        await leaderboard.addScore('PlayerOne', 5000, GameMode.OFFLINE);

        // Verify:
        // 1. Local storage still has the score
        const local = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(local).toHaveLength(1);
        expect(local[0].score).toBe(5000);

        // 2. Error is logged gracefully (no crash)
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    // 3. Graceful Degradation (Session Expiry)
    it('Graceful Degradation: falls back to local-only if session expires mid-game', async () => {
        // Setup: Initially Online ... but mid-operation or just check state
        mockAuthService.getUser.mockReturnValue({ uid: 'u1' });

        // But suppose accessing the token fails or getUser returns null unexpectedly right when addScore runs
        // effectively simulating "logged out state"
        mockAuthService.getUser.mockReturnValue(null);

        // Act
        await leaderboard.addScore('PlayerOne', 4000);

        // Verify
        expect(addDoc).not.toHaveBeenCalled();
        // Local still saved
        const local = leaderboard.getTopScores();
        expect(local[0].score).toBe(4000);
    });
});
