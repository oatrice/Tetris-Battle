import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from './Game';
import { Leaderboard } from './Leaderboard';

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
        // Create a spy to verify the call
        const addScoreSpy = vi.spyOn(Leaderboard.prototype, 'addScore');

        game.start();
        game.setPlayerName('Bob');
        game.score = 500;

        // Trigger game over by forcing collision on spawn
        // We simulate the condition where a piece is spawned but collides immediately
        game.board.isValidPosition = () => false;

        // We use 'any' to access private method spawnPiece or we can just call start() 
        // but start() resets score.
        // Let's simulate the end of a game loop.

        // Actually, let's just make a public helper or expose the logic. 
        // But for now, let's try to trigger it via update if possible, or just call spawnPiece via cast.
        (game as any).nextPiece = null; // force generation
        (game as any).spawnPiece();

        expect(game.gameOver).toBe(true);
        expect(addScoreSpy).toHaveBeenCalledWith('Bob', 500);
    });
});
