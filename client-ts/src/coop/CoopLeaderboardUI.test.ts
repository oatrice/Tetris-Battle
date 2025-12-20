import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createTeamLeaderboardOverlay, createPlayerNamesModal } from './CoopLeaderboardUI';


/**
 * Tests for Team Leaderboard UI
 * TDD: RED -> GREEN -> REFACTOR
 */
// Mock CoopLeaderboard
const mockGetOnlineTeamScores = vi.fn();
const mockGetTopTeamScores = vi.fn();

vi.mock('./CoopLeaderboard', () => {
    return {
        CoopLeaderboard: vi.fn().mockImplementation(() => {
            return {
                getOnlineTeamScores: mockGetOnlineTeamScores,
                getTopTeamScores: mockGetTopTeamScores,
            };
        })
    };
});

describe('Team Leaderboard UI', () => {
    let dom: JSDOM;
    let document: Document;
    let container: HTMLElement;

    beforeEach(() => {
        // Reset mocks
        mockGetOnlineTeamScores.mockResolvedValue([]);
        mockGetTopTeamScores.mockReturnValue([]);

        // Setup DOM environment
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
        document = dom.window.document;
        global.document = document as any;
        global.window = dom.window as any;

        container = document.getElementById('app')!;
    });

    afterEach(() => {
        container.innerHTML = '';
        vi.clearAllMocks();
    });

    // 🟥 Test 1: Render Team Leaderboard Overlay
    describe('Render Team Leaderboard', () => {
        it('should create overlay with "Team Leaderboard" title', async () => {
            await createTeamLeaderboardOverlay();

            const overlay = document.querySelector('.team-leaderboard-overlay');
            expect(overlay).toBeTruthy();

            const title = overlay?.querySelector('h2');
            expect(title?.textContent).toBe('Team Leaderboard');
        });

        it('should display "No scores found yet" when empty', async () => {
            await createTeamLeaderboardOverlay();

            await vi.waitFor(() => {
                const emptyMessage = document.querySelector('.empty-message');
                expect(emptyMessage).toBeTruthy();
                expect(emptyMessage?.textContent).toContain('No scores found yet');
            }, { timeout: 1000 });
        });

        it('should render top 10 team scores in descending order', async () => {
            // Mock scores
            const mockScores = [
                { gameSessionId: '1', player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() },
                { gameSessionId: '2', player1Name: 'Charlie', player2Name: 'Dave', totalScore: 4500, scoreP1: 2500, scoreP2: 2000, linesP1: 12, linesP2: 11, timestamp: Date.now() },
                { gameSessionId: '3', player1Name: 'Eve', player2Name: 'Frank', totalScore: 3000, scoreP1: 1500, scoreP2: 1500, linesP1: 8, linesP2: 7, timestamp: Date.now() }
            ];
            mockGetOnlineTeamScores.mockResolvedValue(mockScores);

            await createTeamLeaderboardOverlay();

            await vi.waitFor(() => {
                const rows = document.querySelectorAll('.leaderboard-row');
                expect(rows.length).toBe(3);
                // ...

                // Check first row (highest score)
                const firstRow = rows[0];
                expect(firstRow.textContent).toContain('Alice');
                expect(firstRow.textContent).toContain('Bob');
                expect(firstRow.textContent).toContain('5000');
            }, { timeout: 1000 });
        });

        it('should include Close button that removes overlay', async () => {
            await createTeamLeaderboardOverlay();

            const closeButton = document.querySelector('.close-btn') as HTMLButtonElement;
            expect(closeButton).toBeTruthy();
            expect(closeButton.textContent).toContain('Close');

            // Click close button
            closeButton.click();

            // Overlay should be removed
            const overlay = document.querySelector('.team-leaderboard-overlay');
            expect(overlay).toBeFalsy();
        });
    });

    // 🟥 Test 2: Player Names Input Modal
    describe('Player Names Input', () => {
        it('should create modal with input fields for Player 1 and Player 2', () => {
            createPlayerNamesModal(container);

            const p1Input = container.querySelector('#player1-name') as HTMLInputElement;
            const p2Input = container.querySelector('#player2-name') as HTMLInputElement;

            expect(p1Input).toBeTruthy();
            expect(p2Input).toBeTruthy();
            expect(p1Input.placeholder).toContain('Player 1');
            expect(p2Input.placeholder).toContain('Player 2');
        });

        it('should have default values "Player 1" and "Player 2"', () => {
            createPlayerNamesModal(container);

            const p1Input = container.querySelector('#player1-name') as HTMLInputElement;
            const p2Input = container.querySelector('#player2-name') as HTMLInputElement;

            expect(p1Input.value).toBe('Player 1');
            expect(p2Input.value).toBe('Player 2');
        });

        it('should call callback with player names when Start button is clicked', () => {
            const onStart = vi.fn();

            createPlayerNamesModal(container, onStart);

            const p1Input = container.querySelector('#player1-name') as HTMLInputElement;
            const p2Input = container.querySelector('#player2-name') as HTMLInputElement;
            const startBtn = container.querySelector('.start-btn') as HTMLButtonElement;

            p1Input.value = 'Alice';
            p2Input.value = 'Bob';
            startBtn.click();

            expect(onStart).toHaveBeenCalledWith('Alice', 'Bob');
        });

        it('should remove modal after Start button is clicked', () => {
            const onStart = vi.fn();

            createPlayerNamesModal(container, onStart);

            const startBtn = container.querySelector('.start-btn') as HTMLButtonElement;
            startBtn.click();

            const modal = container.querySelector('.player-names-modal');
            expect(modal).toBeFalsy();
        });

        it('should have Cancel button that closes modal without callback', () => {
            const onStart = vi.fn();

            createPlayerNamesModal(container, onStart);

            const cancelBtn = container.querySelector('.cancel-btn') as HTMLButtonElement;
            cancelBtn.click();

            expect(onStart).not.toHaveBeenCalled();

            const modal = container.querySelector('.player-names-modal');
            expect(modal).toBeFalsy();
        });
    });

    // 🟥 Test 3: Display individual scores breakdown
    describe('Score Breakdown Display', () => {
        it('should show individual scores (P1 and P2) for each team', async () => {
            const mockScores = [
                { gameSessionId: '1', player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() }
            ];
            mockGetOnlineTeamScores.mockResolvedValue(mockScores);

            await createTeamLeaderboardOverlay();

            await vi.waitFor(() => {
                const row = document.querySelector('.leaderboard-row');
                expect(row).toBeTruthy();
                expect(row?.textContent).toContain('3000'); // P1 score
                expect(row?.textContent).toContain('2000'); // P2 score
            }, { timeout: 1000 });
        });

        it('should display lines cleared for each player', async () => {
            const mockScores = [
                { gameSessionId: '1', player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() }
            ];
            mockGetOnlineTeamScores.mockResolvedValue(mockScores);

            await createTeamLeaderboardOverlay();

            await vi.waitFor(() => {
                const row = document.querySelector('.leaderboard-row');
                expect(row).toBeTruthy();
                expect(row?.textContent).toContain('15'); // P1 lines
                expect(row?.textContent).toContain('10'); // P2 lines
            }, { timeout: 1000 });
        });
    });
});
