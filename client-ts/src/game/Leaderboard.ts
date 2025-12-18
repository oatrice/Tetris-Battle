import { GameMode } from './GameMode';
import { AuthService } from '../services/AuthService';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export interface ScoreEntry {
    name: string;
    score: number;
    timestamp: number;
    userId?: string;
    photoUrl?: string;
}

export class Leaderboard {
    private readonly STORAGE_PREFIX = 'tetris_leaderboard_';
    private readonly MAX_SCORES = 10;
    private authService: AuthService | undefined;

    constructor() { }

    setAuthService(authService: AuthService) {
        this.authService = authService;
    }

    async addScore(name: string, score: number, mode: GameMode = GameMode.OFFLINE, metadata?: { userId?: string, photoUrl?: string }): Promise<void> {
        const scores = this.getTopScores(mode);

        const newEntry: ScoreEntry = {
            name,
            score,
            timestamp: Date.now(),
            ...metadata
        };

        // 1. Save Local
        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);
        const topScores = scores.slice(0, this.MAX_SCORES);
        this.saveScores(topScores, mode);

        // 2. Save Online (if Authenticated)
        if (this.authService && this.authService.getUser()) {
            console.log('[Leaderboard] User authenticated, sending score to online leaderboard...');
            await this.saveScoreOnline(newEntry, mode);
        }
    }

    private async saveScoreOnline(entry: ScoreEntry, mode: GameMode): Promise<void> {
        if (!this.authService) return;
        const app = this.authService.getApp();
        if (!app) return;

        try {
            const db = getFirestore(app);
            const user = this.authService.getUser();

            // Ensure we use the authenticated ID if available, backing up the metadata one
            const finalEntry = {
                ...entry,
                userId: user?.uid || entry.userId,
                mode: mode // vital for querying
            };

            await addDoc(collection(db, 'leaderboard'), finalEntry);
            console.log('[Leaderboard] Score saved to Firestore');
        } catch (e) {
            console.error('[Leaderboard] Failed to save score online', e);
        }
    }

    async getOnlineScores(mode: GameMode = GameMode.OFFLINE): Promise<ScoreEntry[]> {
        if (!this.authService) return [];
        const app = this.authService.getApp();
        if (!app) return [];

        try {
            const db = getFirestore(app);
            const q = query(
                collection(db, 'leaderboard'),
                where('mode', '==', mode),
                orderBy('score', 'desc'),
                limit(this.MAX_SCORES)
            );

            const querySnapshot = await getDocs(q);
            const scores: ScoreEntry[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as ScoreEntry;
                scores.push(data);
            });
            return scores;
        } catch (e) {
            console.error('[Leaderboard] Failed to fetch online scores', e);
            return [];
        }
    }

    getTopScores(mode: GameMode = GameMode.OFFLINE): ScoreEntry[] {
        try {
            const key = this.getStorageKey(mode);
            const data = localStorage.getItem(key);

            // Fallback & Migration for legacy data
            if (!data && mode === GameMode.OFFLINE) {
                const legacyData = localStorage.getItem('tetris_leaderboard');
                if (legacyData) {
                    console.log('[Leaderboard] Migrating legacy scores to OFFLINE mode.');
                    const scores = JSON.parse(legacyData);
                    this.saveScores(scores, GameMode.OFFLINE); // Persist immediately
                    return scores;
                }
            }
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load leaderboard', e);
            return [];
        }
    }

    async mergeLocalScoresToUser(userId: string, photoUrl: string | null | undefined): Promise<void> {
        // Migrate "Guest" sessions to the authenticated user
        const modes = [GameMode.OFFLINE, GameMode.SPECIAL];

        for (const mode of modes) {
            const scores = this.getTopScores(mode);
            let modified = false;
            const scoresToUpload: ScoreEntry[] = [];

            scores.forEach(score => {
                // If it's an anonymous score (no userId), claim it
                if (!score.userId) {
                    score.userId = userId;
                    if (photoUrl) score.photoUrl = photoUrl;
                    modified = true;
                    scoresToUpload.push(score);
                }
            });

            if (modified) {
                this.saveScores(scores, mode);
                console.log(`[Leaderboard] Merged anonymous scores for mode ${mode} to user ${userId}`);

                // Sync to Online
                if (this.authService && this.authService.getUser()) {
                    for (const score of scoresToUpload) {
                        await this.saveScoreOnline(score, mode);
                    }
                }
            }
        }
    }

    private saveScores(scores: ScoreEntry[], mode: GameMode): void {
        try {
            const key = this.getStorageKey(mode);
            localStorage.setItem(key, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save leaderboard', e);
        }
    }

    private getStorageKey(mode: GameMode): string {
        return `${this.STORAGE_PREFIX}${mode}`;
    }
}
