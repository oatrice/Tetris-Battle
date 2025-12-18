import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { Leaderboard } from './Leaderboard';
import { GameMode } from './GameMode';

describe('Game Leaderboard Integration', () => {
    let game: Game;

    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        game = new Game();
    });

    it('should have a default player name', () => {
        expect(game.playerName).toBe('Player');
    });

    it('should allow renaming player', () => {
        game.setPlayerName('Alice');
        expect(game.playerName).toBe('Alice');
    });

    it('should save score to leaderboard when game over', () => {
        const addScoreSpy = vi.spyOn(Leaderboard.prototype, 'addScore');

        game.start();
        game.setPlayerName('Bob');
        game.score = 500;

        game.board.isValidPosition = () => false;
        (game as any).nextPiece = null;
        (game as any).spawnPiece();

        expect(game.gameOver).toBe(true);
        expect(addScoreSpy).toHaveBeenCalledWith(
            'Bob',
            500,
            GameMode.OFFLINE,
            expect.objectContaining({ userId: undefined, photoUrl: undefined })
        );
    });

    it('should save score with user metadata when available', () => {
        const addScoreSpy = vi.spyOn(Leaderboard.prototype, 'addScore');
        const userId = 'user-123';
        const photoUrl = 'http://example.com/photo.jpg';

        game.start();
        game.setPlayerName('Authenticated User');
        game.score = 1000;

        // New method to implement
        game.setPlayerMetadata(userId, photoUrl);

        game.board.isValidPosition = () => false;
        (game as any).nextPiece = null;
        (game as any).spawnPiece();

        expect(game.gameOver).toBe(true);
        expect(addScoreSpy).toHaveBeenCalledWith('Authenticated User', 1000, GameMode.OFFLINE, { userId, photoUrl });
    });
});
