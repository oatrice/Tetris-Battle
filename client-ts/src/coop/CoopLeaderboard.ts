import { AuthService } from '../services/AuthService';
import { getFirestore, collection, getDocs, query, where, orderBy, limit, doc, setDoc } from 'firebase/firestore';

/**
 * Team Score Entry for Cooperative Mode
 */
export interface TeamScoreEntry {
    gameSessionId: string; // Unique ID for this game session (prevents duplicates)
    player1Name: string;
    player2Name: string;
    scoreP1: number;
    scoreP2: number;
    totalScore: number;
    linesP1: number;
    linesP2: number;
    timestamp: number;
    userId?: string; // For authenticated users
    photoUrl?: string;
}

/**
 * CoopLeaderboard
 * Manages Team Scores with Offline-First approach and Auto-Sync
 */
export class CoopLeaderboard {
    private readonly STORAGE_KEY = 'tetris_coop_leaderboard';
    private readonly SYNC_QUEUE_KEY = 'tetris_coop_sync_queue';
    private readonly MAX_SCORES = 10;
    private authService: AuthService | undefined;
    private onlineListener?: () => void;

    constructor() {
        // Auto-start online listener
        this.startOnlineListener();
    }

    setAuthService(authService: AuthService) {
        this.authService = authService;
    }

    /**
     * Add Team Score to Local Storage and Queue for Sync if needed
     */
    async addTeamScore(teamScore: TeamScoreEntry): Promise<void> {
        // 1. Save to Local Storage immediately (Offline-First)
        this.saveToLocalStorage(teamScore);

        // 2. Determine if we should sync to Firestore
        const isOnline = navigator.onLine;
        const isAuthenticated = this.authService && this.authService.getUser();

        if (isOnline && isAuthenticated) {
            // Try to sync immediately
            await this.saveScoreOnline(teamScore);
        } else if (isAuthenticated) {
            // Offline but authenticated - Add to queue
            this.addToSyncQueue(teamScore);
        }
        // If not authenticated, just keep in local storage
    }

    /**
     * Save team score to Local Storage
     */
    private saveToLocalStorage(teamScore: TeamScoreEntry): void {
        try {
            const scores = this.getTopTeamScores();
            scores.push(teamScore);
            scores.sort((a, b) => b.totalScore - a.totalScore);
            const topScores = scores.slice(0, this.MAX_SCORES);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(topScores));
            console.log('[CoopLeaderboard] Team score saved to local storage');
        } catch (e) {
            console.warn('[CoopLeaderboard] Failed to save to local storage', e);
        }
    }

    /**
     * Get top team scores from Local Storage
     */
    getTopTeamScores(): TeamScoreEntry[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('[CoopLeaderboard] Failed to load team scores', e);
            return [];
        }
    }

    /**
     * Save team score to Firestore
     */
    private async saveScoreOnline(entry: TeamScoreEntry): Promise<void> {
        if (!this.authService) return;
        const app = this.authService.getApp();
        if (!app) return;

        try {
            const db = getFirestore(app);
            const user = this.authService.getUser();

            const finalEntry = {
                ...entry,
                userId: user?.uid || 'anonymous',
                mode: 'COOP' // Mode identifier
            };

            // Use gameSessionId as document ID to prevent duplicates
            const docRef = doc(db, 'coop_leaderboard', entry.gameSessionId);

            // Use setDoc without merge to ensure uniqueness
            await setDoc(docRef, finalEntry);

            console.log('[CoopLeaderboard] Team score saved to Firestore');
        } catch (e: any) {
            // Check if error is due to duplicate (though setDoc should overwrite)
            // This happens if Firestore Security Rules prevent overwrites
            if (e.code === 'permission-denied' && e.message?.includes('already exists')) {
                console.log('[CoopLeaderboard] Score already uploaded by peer, skipping');
                return; // Don't retry or queue
            }

            console.error('[CoopLeaderboard] Failed to save team score online', e);
            // On other failures, add to queue for retry
            this.addToSyncQueue(entry);
        }
    }

    /**
     * Add team score to sync queue (for offline submission)
     */
    private addToSyncQueue(teamScore: TeamScoreEntry): void {
        try {
            const queue = this.getSyncQueue();
            queue.push(teamScore);
            localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue));
            console.log('[CoopLeaderboard] Team score added to sync queue');
        } catch (e) {
            console.warn('[CoopLeaderboard] Failed to add to sync queue', e);
        }
    }

    /**
     * Get sync queue from Local Storage
     */
    getSyncQueue(): TeamScoreEntry[] {
        try {
            const data = localStorage.getItem(this.SYNC_QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('[CoopLeaderboard] Failed to load sync queue', e);
            return [];
        }
    }

    /**
     * Sync pending scores to Firestore (called when going back online)
     */
    async syncPendingScores(): Promise<void> {
        const queue = this.getSyncQueue();
        if (queue.length === 0) {
            console.log('[CoopLeaderboard] No pending scores to sync');
            return;
        }

        console.log(`[CoopLeaderboard] Syncing ${queue.length} pending team scores...`);

        // Sync all queued scores
        for (const score of queue) {
            await this.saveScoreOnline(score);
        }

        // Clear the queue after successful sync
        this.clearSyncQueue();
    }

    /**
     * Clear sync queue after successful sync
     */
    private clearSyncQueue(): void {
        try {
            localStorage.removeItem(this.SYNC_QUEUE_KEY);
            console.log('[CoopLeaderboard] Sync queue cleared');
        } catch (e) {
            console.warn('[CoopLeaderboard] Failed to clear sync queue', e);
        }
    }

    /**
     * Start listening to 'online' event for auto-sync
     */
    startOnlineListener(): void {
        this.onlineListener = async () => {
            console.log('[CoopLeaderboard] Internet connection restored, syncing pending scores...');
            await this.syncPendingScores();
        };

        window.addEventListener('online', this.onlineListener);
        console.log('[CoopLeaderboard] Online listener started');
    }

    /**
     * Stop listening to 'online' event
     */
    stopOnlineListener(): void {
        if (this.onlineListener) {
            window.removeEventListener('online', this.onlineListener);
            console.log('[CoopLeaderboard] Online listener stopped');
        }
    }

    /**
     * Get online team scores from Firestore
     */
    /**
     * Get online team scores from Firestore
     * Public access - does not require authentication
     */
    async getOnlineTeamScores(): Promise<TeamScoreEntry[]> {
        try {
            // Try to get DB from AuthService first, or fallback to default instance
            let db;
            const app = this.authService?.getApp();

            if (app) {
                db = getFirestore(app);
            } else {
                // Attempt to use default app instance (initialized elsewhere)
                try {
                    db = getFirestore();
                } catch (e) {
                    console.warn('[CoopLeaderboard] Default Firestore app not found');
                    return [];
                }
            }

            const q = query(
                collection(db, 'coop_leaderboard'),
                where('mode', '==', 'COOP'),
                orderBy('totalScore', 'desc'),
                limit(this.MAX_SCORES)
            );

            const querySnapshot = await getDocs(q);
            const scores: TeamScoreEntry[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as TeamScoreEntry;
                scores.push(data);
            });
            return scores;
        } catch (e) {
            console.error('[CoopLeaderboard] Failed to fetch online team scores', e);
            return [];
        }
    }
}
