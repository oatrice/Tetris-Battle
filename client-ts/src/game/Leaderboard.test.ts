import { describe, it, expect, beforeEach } from 'vitest';
import { Leaderboard } from './Leaderboard';

describe('Leaderboard', () => {
    let leaderboard: Leaderboard;

    beforeEach(() => {
        localStorage.clear();
        leaderboard = new Leaderboard();
    });

    it('should save a score and retrieve it', () => {
        leaderboard.addScore('Player1', 1000);
        const scores = leaderboard.getTopScores();
        expect(scores).toHaveLength(1);
        expect(scores[0]).toEqual({
            name: 'Player1',
            score: 1000,
            timestamp: expect.any(Number)
        });
    });

    it('should keep top 10 scores only', () => {
        for (let i = 1; i <= 15; i++) {
            leaderboard.addScore(`Player${i}`, i * 100);
        }
        const scores = leaderboard.getTopScores();
        expect(scores).toHaveLength(10);
        expect(scores[0].score).toBe(1500); // Highest score first
    });

    it('should return empty list if no scores', () => {
        const scores = leaderboard.getTopScores();
        expect(scores).toEqual([]);
    });
});
