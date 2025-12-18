import { GameMode } from './GameMode';

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

    constructor() { }

    addScore(name: string, score: number, mode: GameMode = GameMode.OFFLINE, metadata?: { userId?: string, photoUrl?: string }): void {
        const scores = this.getTopScores(mode);

        const newEntry: ScoreEntry = {
            name,
            score,
            timestamp: Date.now(),
            ...metadata
        };

        scores.push(newEntry);

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);

        // Keep top N
        const topScores = scores.slice(0, this.MAX_SCORES);

        this.saveScores(topScores, mode);
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

    mergeLocalScoresToUser(userId: string, photoUrl: string | null | undefined): void {
        // Only merge offline/solo scores? Or all?
        // Usually we only migrate "Guest" sessions which are likely Offline/Solo mode.
        // If we had Special mode played as guest, we might want to migrate that too if stored locally.
        // Let's migrate both just in case, or stick to Offline per requirements implying "Solo".
        // Requirement says "Solo" and "Special" are separated.

        [GameMode.OFFLINE, GameMode.SPECIAL].forEach(mode => {
            const scores = this.getTopScores(mode);
            let modified = false;

            scores.forEach(score => {
                // If it's an anonymous score (no userId), claim it
                if (!score.userId) {
                    score.userId = userId;
                    if (photoUrl) score.photoUrl = photoUrl;
                    modified = true;
                }
            });

            if (modified) {
                this.saveScores(scores, mode);
                console.log(`[Leaderboard] Merged anonymous scores for mode ${mode} to user ${userId}`);
            }
        });
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
