
import { describe, it, expect, beforeEach } from 'vitest';
import { Leaderboard } from './Leaderboard';
import { GameMode } from './GameMode';

describe('Leaderboard Modes', () => {
    let leaderboard: Leaderboard;

    beforeEach(() => {
        localStorage.clear();
        leaderboard = new Leaderboard();
    });

    it('should separate scores for different modes', () => {
        // Add score to OFFLINE mode
        leaderboard.addScore('Player1', 100, GameMode.OFFLINE);

        // Add score to SPECIAL mode
        leaderboard.addScore('Player2', 200, GameMode.SPECIAL);

        // Check OFFLINE scores
        const offlineScores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(offlineScores).toHaveLength(1);
        expect(offlineScores[0].name).toBe('Player1');
        expect(offlineScores[0].score).toBe(100);

        // Check SPECIAL scores
        const specialScores = leaderboard.getTopScores(GameMode.SPECIAL);
        expect(specialScores).toHaveLength(1);
        expect(specialScores[0].name).toBe('Player2');
        expect(specialScores[0].score).toBe(200);
    });

    it('should default to OFFLINE mode if no mode provided', () => {
        // Call addScore without the mode argument
        leaderboard.addScore('DefaultPlayer', 150);

        const offlineScores = leaderboard.getTopScores(GameMode.OFFLINE);
        const specialScores = leaderboard.getTopScores(GameMode.SPECIAL);

        expect(offlineScores).toHaveLength(1);
        expect(offlineScores[0].name).toBe('DefaultPlayer');
        expect(offlineScores[0].score).toBe(150);

        // Ensure it didn't leak to other modes
        expect(specialScores).toHaveLength(0);
    });

    it('should return empty array for initialized GameMode with no scores', () => {
        // GameMode.ONLINE has not been touched yet
        const onlineScores = leaderboard.getTopScores(GameMode.ONLINE);
        expect(onlineScores).toEqual([]);
        expect(onlineScores).toBeInstanceOf(Array);
    });

    it('should handle adding score to a completely new GameMode', () => {
        // Using GameMode.ONLINE as the "new" mode
        leaderboard.addScore('OnlinePlayer', 300, GameMode.ONLINE);

        const onlineScores = leaderboard.getTopScores(GameMode.ONLINE);
        expect(onlineScores).toHaveLength(1);
        expect(onlineScores[0].name).toBe('OnlinePlayer');
        expect(onlineScores[0].score).toBe(300);
    });

    it('should handle invalid or unexpected values gracefully', () => {
        // Test with empty name and negative score
        // Current implementation allows it, this verifies it doesn't crash
        leaderboard.addScore('', -50, GameMode.OFFLINE);

        const scores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(scores).toHaveLength(1);
        expect(scores[0].name).toBe('');
        expect(scores[0].score).toBe(-50);
    });
});
