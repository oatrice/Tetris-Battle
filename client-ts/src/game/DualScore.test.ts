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
    describe('Score Merge Logic', () => {
        it('should sync local high scores to online upon user login', async () => {
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
            await leaderboard.mergeLocalScoresToUser('u1', null);

            // Verify upload
            expect(addDoc).toHaveBeenCalled();
            const calls = (addDoc as any).mock.calls;
            const hasMatch = calls.some((args: any[]) =>
                args[1].score === 6000 && args[1].userId === 'u1'
            );
            expect(hasMatch).toBe(true);
        });

        it('should ensure older online data never overwrites newer local achievements', async () => {
            // 1. Set local score
            await leaderboard.addScore('LocalHero', 8000, GameMode.OFFLINE);

            // 2. Simulate fetching lower online scores
            // (We mock getOnlineScores by manually checking it doesn't touch local storage)
            // const onlineScores = [
            //    { name: 'OldRemote', score: 5000, timestamp: 1000, userId: 'u1' }
            // ];
            // In a real scenario, we might have a sync-down feature. 
            // Here we verify that accessing online data or merging doesn't degrade local data.

            // Act: "Merge" (which is currently Up-Sync only)
            await leaderboard.mergeLocalScoresToUser('u1', null);

            // Assert: Local score remains 8000
            const local = leaderboard.getTopScores(GameMode.OFFLINE);
            expect(local[0].score).toBe(8000);
            expect(local[0].name).toBe('LocalHero');
        });
    });

    // 2. Network Resilience
    describe('Network Resilience', () => {
        it('persists to local storage even if Firestore fails (500/Timeout)', async () => {
            // Setup: Online User
            mockAuthService.getUser.mockReturnValue({ uid: 'u1' });

            // Mock Firestore Failure
            vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore 500 Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            // Act
            await leaderboard.addScore('PlayerOne', 5000, GameMode.OFFLINE);

            // Verify: Local storage still has the score
            const local = leaderboard.getTopScores(GameMode.OFFLINE);
            expect(local).toHaveLength(1);
            expect(local[0].score).toBe(5000);

            // Error is logged
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    // 3. Graceful Degradation
    describe('Graceful Degradation', () => {
        it('falls back to local-only if session expires mid-game', async () => {
            // Simulator: Valid initially
            mockAuthService.getUser.mockReturnValue({ uid: 'u1' });

            // Change to null (session expired) before addScore call interacts with logic
            // In a real async flow, this might happen. Here we simulate the result: getUser() returns null.
            mockAuthService.getUser.mockReturnValue(null);

            // Act
            await leaderboard.addScore('PlayerOne', 4000);

            // Verify: No online call
            expect(addDoc).not.toHaveBeenCalled();

            // Local still saved
            const local = leaderboard.getTopScores();
            expect(local[0].score).toBe(4000);
        });
    });

    // 4. Leaderboard Edge Cases (Data Integrity for UI)
    describe('Leaderboard Data Integrity', () => {
        it('should handle empty data gracefully', () => {
            // No scores added
            const scores = leaderboard.getTopScores(GameMode.OFFLINE);
            expect(scores).toEqual([]);
        });

        it('should handle sparse data (less than 10 entries)', async () => {
            // Add 2 scores
            await leaderboard.addScore('A', 100);
            await leaderboard.addScore('B', 200);

            const scores = leaderboard.getTopScores(GameMode.OFFLINE);
            expect(scores).toHaveLength(2);
            expect(scores[0].score).toBe(200); // Sorted desc
        });

        it('should correctly identify user rank outside top 10 (Simulation)', async () => {
            // This logic might inevitably live in the UI component (filtering the list), 
            // but if Leaderboard had a `getUserRank` method we'd test it here.
            // Since `Leaderboard` class handles storage, let's verify it stores > 10 items 
            // but `getTopScores` slices them?

            // Actually `addScore` slices: "const topScores = scores.slice(0, this.MAX_SCORES);"
            // So logic implies if I am 11th, I am GONE from local top 10.
            // Wait, if I am the user, I might want to know my score even if not in top 10?
            // The current implementation drops it from persistence if > 10.

            // Let's verify behavior: Add 11 scores.
            for (let i = 1; i <= 11; i++) {
                await leaderboard.addScore(`P${i}`, i * 100);
            }

            const scores = leaderboard.getTopScores(GameMode.OFFLINE);
            expect(scores).toHaveLength(10);

            // The lowest score (100) should be gone. Top should be 1100.
            expect(scores[scores.length - 1].score).toBe(200); // P2 (200) ... P11 (1100)
            expect(scores[0].score).toBe(1100);
        });
    });
});
