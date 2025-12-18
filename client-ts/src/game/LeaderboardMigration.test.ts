
import { describe, it, expect, beforeEach } from 'vitest';
import { Leaderboard, ScoreEntry } from './Leaderboard';
import { GameMode } from './GameMode';

describe('Leaderboard Migration & Merge', () => {
    let leaderboard: Leaderboard;
    const LEGACY_KEY = 'tetris_leaderboard';
    const NORMAL_KEY = 'tetris_leaderboard_OFFLINE'; // Matches GameMode.OFFLINE value
    // const SPECIAL_KEY = 'tetris_leaderboard_SPECIAL'; 

    beforeEach(() => {
        localStorage.clear();
        leaderboard = new Leaderboard();
    });

    it('should migrate legacy scores to Normal (Offline) mode on initialization', () => {
        // ARRANGE
        const legacyScores: ScoreEntry[] = [
            { name: 'Veteran', score: 5000, timestamp: 12345 }
        ];
        localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyScores));

        // ACT
        // Instantiate new leaderboard to trigger migration check or call explicit migrate
        // Ideally migration happens lazily or on init.
        // Let's assume we want it to happen when accessing Normal scores.
        const scores = leaderboard.getTopScores(GameMode.OFFLINE);

        // ASSERT
        // Should find the legacy score
        expect(scores).toHaveLength(1);
        expect(scores[0].name).toBe('Veteran');
        expect(scores[0].score).toBe(5000);

        // Should have written to new key (Auto-migration)
        const newStorage = localStorage.getItem(NORMAL_KEY);
        expect(newStorage).toBeTruthy();
        expect(JSON.parse(newStorage!)).toHaveLength(1);
    });

    it('should merge anonymous local scores when user signs in', () => {
        // ARRANGE
        // 1. User plays offline
        leaderboard.addScore('Anonymous', 2500, GameMode.OFFLINE);

        let scores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(scores[0].userId).toBeUndefined();

        // 2. User signs in
        const user = { uid: 'u-123', photoURL: 'http://pic.com/1.jpg', displayName: 'SignedInUser' };

        // ACT
        // We'll hypothesize a method mergeLocalToUser
        leaderboard.mergeLocalScoresToUser(user.uid, user.photoURL);

        // ASSERT
        scores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(scores[0].score).toBe(2500);
        expect(scores[0].userId).toBe('u-123'); // Bound to new user
        expect(scores[0].photoUrl).toBe('http://pic.com/1.jpg');
    });

    it('should not overwrite existing user scores if merging duplicates', () => {
        // Edge case: prevents duplicating strictly identical scores or handles logic
        // For now, simpler test:
        leaderboard.addScore('Me', 100, GameMode.OFFLINE);
        leaderboard.mergeLocalScoresToUser('u1', 'p1'); // first merge
        leaderboard.mergeLocalScoresToUser('u1', 'p1'); // second merge

        const scores = leaderboard.getTopScores(GameMode.OFFLINE);
        expect(scores.length).toBe(1);
    });
});
