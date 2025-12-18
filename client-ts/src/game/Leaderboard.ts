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
            // Fallback for legacy data (optional, but good for transition)
            if (!data && mode === GameMode.OFFLINE) {
                const legacyData = localStorage.getItem('tetris_leaderboard');
                if (legacyData) return JSON.parse(legacyData);
            }
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load leaderboard', e);
            return [];
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
