import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoopLeaderboard } from './CoopLeaderboard';
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

describe('CoopLeaderboard - Offline-First with Auto-Sync', () => {
    let leaderboard: CoopLeaderboard;
    let mockAuthService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        leaderboard = new CoopLeaderboard();

        // Setup default mock auth (Offline/Guest)
        mockAuthService = {
            getUser: vi.fn().mockReturnValue(null),
            getApp: vi.fn().mockReturnValue({})
        };
        leaderboard.setAuthService(mockAuthService);

        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    // 🟥 Test 1: บันทึก Team Score ลง Local Storage ทันที
    describe('Local Storage - Immediate Save', () => {
        it('should save team score to local storage immediately', async () => {
            const teamScore = {
                player1Name: 'Alice',
                player2Name: 'Bob',
                scoreP1: 3000,
                scoreP2: 2500,
                totalScore: 5500,
                linesP1: 15,
                linesP2: 12,
                timestamp: Date.now()
            };

            await leaderboard.addTeamScore(teamScore);

            // Verify Local Storage
            const localScores = leaderboard.getTopTeamScores();
            expect(localScores).toHaveLength(1);
            expect(localScores[0].totalScore).toBe(5500);
            expect(localScores[0].player1Name).toBe('Alice');
            expect(localScores[0].player2Name).toBe('Bob');
        });

        it('should keep top 10 team scores sorted by totalScore', async () => {
            // Add 12 scores
            for (let i = 1; i <= 12; i++) {
                await leaderboard.addTeamScore({
                    player1Name: `P1-${i}`,
                    player2Name: `P2-${i}`,
                    scoreP1: i * 100,
                    scoreP2: i * 50,
                    totalScore: i * 150,
                    linesP1: i,
                    linesP2: i,
                    timestamp: Date.now()
                });
            }

            const localScores = leaderboard.getTopTeamScores();
            expect(localScores).toHaveLength(10);
            expect(localScores[0].totalScore).toBe(12 * 150); // Highest
            expect(localScores[9].totalScore).toBe(3 * 150); // 10th place
        });
    });

    // 🟥 Test 2: Sync Queue เมื่อ Offline
    describe('Sync Queue - Offline Mode', () => {
        it('should queue team score when offline', async () => {
            // Simulate Offline
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
            mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'User1' });

            const teamScore = {
                player1Name: 'Charlie',
                player2Name: 'Dave',
                scoreP1: 4000,
                scoreP2: 3500,
                totalScore: 7500,
                linesP1: 20,
                linesP2: 18,
                timestamp: Date.now()
            };

            await leaderboard.addTeamScore(teamScore);

            // Verify queue
            const queue = leaderboard.getSyncQueue();
            expect(queue).toHaveLength(1);
            expect(queue[0].totalScore).toBe(7500);

            // Verify NO Firestore call
            expect(addDoc).not.toHaveBeenCalled();
        });

        it('should NOT sync to Firestore when offline even if authenticated', async () => {
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
            mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'User1' });

            await leaderboard.addTeamScore({
                player1Name: 'Eve',
                player2Name: 'Frank',
                scoreP1: 2000,
                scoreP2: 1500,
                totalScore: 3500,
                linesP1: 10,
                linesP2: 8,
                timestamp: Date.now()
            });

            expect(addDoc).not.toHaveBeenCalled();
        });
    });

    // 🟥 Test 3: Auto-Sync เมื่อ Internet กลับมา
    describe('Auto-Sync - Internet Recovery', () => {
        it('should auto-sync queued scores when going back online', async () => {
            // Step 1: Go Offline
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
            mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'User1' });

            // Add score while offline
            await leaderboard.addTeamScore({
                player1Name: 'Grace',
                player2Name: 'Hank',
                scoreP1: 5000,
                scoreP2: 4500,
                totalScore: 9500,
                linesP1: 25,
                linesP2: 23,
                timestamp: Date.now()
            });

            expect(addDoc).not.toHaveBeenCalled();
            expect(leaderboard.getSyncQueue()).toHaveLength(1);

            // Step 2: Go Online
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

            // Trigger sync (simulate 'online' event)
            await leaderboard.syncPendingScores();

            // Verify Firestore was called
            expect(addDoc).toHaveBeenCalled();
            const calls = (addDoc as any).mock.calls;
            expect(calls[0][1].totalScore).toBe(9500);

            // Verify queue is cleared
            expect(leaderboard.getSyncQueue()).toHaveLength(0);
        });

        it('should handle multiple queued scores during sync', async () => {
            Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
            mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'User1' });

            // Add 3 scores while offline
            for (let i = 1; i <= 3; i++) {
                await leaderboard.addTeamScore({
                    player1Name: `P1-${i}`,
                    player2Name: `P2-${i}`,
                    scoreP1: i * 1000,
                    scoreP2: i * 900,
                    totalScore: i * 1900,
                    linesP1: i * 5,
                    linesP2: i * 4,
                    timestamp: Date.now()
                });
            }

            expect(leaderboard.getSyncQueue()).toHaveLength(3);

            // Go Online and Sync
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
            await leaderboard.syncPendingScores();

            // Verify all 3 were synced
            expect(addDoc).toHaveBeenCalledTimes(3);
            expect(leaderboard.getSyncQueue()).toHaveLength(0);
        });
    });

    // 🟥 Test 4: Local-First ถึงแม้ว่าจะ Sync ล้มเหลว
    describe('Network Resilience', () => {
        it('should keep score in local storage if Firestore sync fails', async () => {
            mockAuthService.getUser.mockReturnValue({ uid: 'u1', displayName: 'User1' });
            Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

            // Mock Firestore failure
            vi.mocked(addDoc).mockRejectedValueOnce(new Error('Firestore 503 Error'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            await leaderboard.addTeamScore({
                player1Name: 'Ivy',
                player2Name: 'Jack',
                scoreP1: 6000,
                scoreP2: 5500,
                totalScore: 11500,
                linesP1: 30,
                linesP2: 28,
                timestamp: Date.now()
            });

            // Verify Local Storage still has the score
            const localScores = leaderboard.getTopTeamScores();
            expect(localScores).toHaveLength(1);
            expect(localScores[0].totalScore).toBe(11500);

            // Verify error was logged
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    // 🟥 Test 5: Listen to 'online' event (Auto-Sync trigger)
    describe('Online Event Listener', () => {
        it('should start listening to online event when initialized', () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

            const newLeaderboard = new CoopLeaderboard();
            newLeaderboard.startOnlineListener();

            expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
        });
    });
});
