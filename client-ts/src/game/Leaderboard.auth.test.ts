import { describe, it, expect, beforeEach } from 'vitest';
import { Leaderboard } from './Leaderboard';
import { GameMode } from './GameMode';

describe('Leaderboard Auth Integration', () => {
    let leaderboard: Leaderboard;

    beforeEach(() => {
        localStorage.clear();
        leaderboard = new Leaderboard();
    });

    it('should save score with user ID and photo URL', () => {
        const userId = 'google-123';
        const photoUrl = 'https://example.com/photo.jpg';

        leaderboard.addScore('Player 1', 1000, GameMode.OFFLINE, { userId, photoUrl });

        const scores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(scores[0]).toMatchObject({
            name: 'Player 1',
            score: 1000,
            userId,
            photoUrl
        });
    });

    it('should preserve user info after loading', () => {
        const userId = 'google-456';
        leaderboard.addScore('Player 2', 2000, GameMode.OFFLINE, { userId });

        // Reload
        const newLeaderboard = new Leaderboard();
        const scores = newLeaderboard.getTopScores(GameMode.OFFLINE);

        expect(scores[0].userId).toBe(userId);
    });
});
