import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoopGame } from './CoopGame';
import { CoopLeaderboard } from './CoopLeaderboard';

// Mock CoopLeaderboard dependency
vi.mock('./CoopLeaderboard');

describe('CoopGame Integration with CoopLeaderboard', () => {
    let game: CoopGame;
    let mockAddTeamScore: any;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();

        // Setup Mock Implementation
        mockAddTeamScore = vi.fn().mockResolvedValue(true);
        // @ts-ignore
        CoopLeaderboard.mockImplementation(() => ({
            addTeamScore: mockAddTeamScore,
            setAuthService: vi.fn(),
            getOnlineTeamScores: vi.fn(),
            getTopTeamScores: vi.fn()
        }));

        // Initialize game
        game = new CoopGame();
    });

    afterEach(() => {
        game.stop();
    });

    it('should persist final score exactly once when Game Over occurs', async () => {
        // Setup game state
        game.scoreP1 = 1000;
        game.scoreP2 = 500;
        game.linesP1 = 10;
        game.linesP2 = 5;
        game.setPlayerNames('P1_Test', 'P2_Test');

        // Force Game Over scenario
        // 1. Mock applyGravity to return locked state (triggering spawn attempt)
        vi.spyOn(game.controller, 'applyGravity').mockReturnValue({
            player1Locked: true,
            player2Locked: false
        });

        // 2. Mock spawnPiece to fail (game over condition)
        vi.spyOn(game.controller, 'spawnPiece').mockReturnValue(false);

        // Run update cycle (simulate delta > dropInterval)
        game.update(1001);

        // Assertions
        expect(game.gameOver).toBe(true);
        expect(mockAddTeamScore).toHaveBeenCalledTimes(1);

        // Check data integrity
        const savedScore = mockAddTeamScore.mock.calls[0][0];
        expect(savedScore).toMatchObject({
            player1Name: 'P1_Test',
            player2Name: 'P2_Test',
            scoreP1: 1000,
            scoreP2: 500,
            totalScore: 1500,
            linesP1: 10,
            linesP2: 5
        });

        // Call update again to ensure idempotency (should not save again)
        game.update(1001);
        expect(mockAddTeamScore).toHaveBeenCalledTimes(1);
    });

    it('should be resilient to leaderboard failures (async error handling)', async () => {
        // Setup mock to throw error
        mockAddTeamScore.mockRejectedValue(new Error('Network Error'));

        // Mock controller logic
        vi.spyOn(game.controller, 'applyGravity').mockReturnValue({
            player1Locked: true,
            player2Locked: false
        });
        vi.spyOn(game.controller, 'spawnPiece').mockReturnValue(false);

        // Capture console.error to verify logging
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        // Run update cycle
        expect(() => {
            game.update(1001);
        }).not.toThrow();

        // Wait potential promise rejection handling
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(game.gameOver).toBe(true);
        expect(mockAddTeamScore).toHaveBeenCalledTimes(1);

        // Verify error was logged safely
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to save team score'),
            expect.any(Error)
        );
    });

    it('should use default player names if not configured', async () => {
        // Do NOT call setPlayerNames()

        // 1. Mock applyGravity to return locked state (triggering spawn attempt)
        vi.spyOn(game.controller, 'applyGravity').mockReturnValue({
            player1Locked: true,
            player2Locked: false
        });
        vi.spyOn(game.controller, 'spawnPiece').mockReturnValue(false);

        game.update(1001);

        expect(mockAddTeamScore).toHaveBeenCalledTimes(1);

        const savedScore = mockAddTeamScore.mock.calls[0][0];
        expect(savedScore.player1Name).toBe('Player 1');
        expect(savedScore.player2Name).toBe('Player 2');
    });
});
