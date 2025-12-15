export interface ScoreEntry {
    name: string;
    score: number;
    timestamp: number;
}

export class Leaderboard {
    private readonly STORAGE_KEY = 'tetris_leaderboard';
    private readonly MAX_SCORES = 10;

    constructor() { }

    addScore(name: string, score: number): void {
        const scores = this.getTopScores();

        const newEntry: ScoreEntry = {
            name,
            score,
            timestamp: Date.now()
        };

        scores.push(newEntry);

        // Sort by score descending
        scores.sort((a, b) => b.score - a.score);

        // Keep top N
        const topScores = scores.slice(0, this.MAX_SCORES);

        this.saveScores(topScores);
    }

    getTopScores(): ScoreEntry[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load leaderboard', e);
            return [];
        }
    }

    private saveScores(scores: ScoreEntry[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save leaderboard', e);
        }
    }
}
