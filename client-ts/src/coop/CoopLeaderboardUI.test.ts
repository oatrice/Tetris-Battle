import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createTeamLeaderboardOverlay, createPlayerNamesModal } from './CoopLeaderboardUI';


/**
 * Tests for Team Leaderboard UI
 * TDD: RED -> GREEN -> REFACTOR
 */
describe('Team Leaderboard UI', () => {
    let dom: JSDOM;
    let document: Document;
    let container: HTMLElement;

    beforeEach(() => {
        // Setup DOM environment
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
        document = dom.window.document;
        global.document = document as any;
        global.window = dom.window as any;

        container = document.getElementById('app')!;
        localStorage.clear();
    });

    afterEach(() => {
        container.innerHTML = '';
    });

    // 🟥 Test 1: Render Team Leaderboard Overlay
    describe('Render Team Leaderboard', () => {
        it('should create overlay with "Team Leaderboard" title', () => {
            createTeamLeaderboardOverlay(container);

            const overlay = container.querySelector('.leaderboard-overlay');
            expect(overlay).toBeTruthy();

            const title = overlay?.querySelector('h2');
            expect(title?.textContent).toBe('Team Leaderboard');
        });

        it('should display "No team scores yet" when empty', () => {
            createTeamLeaderboardOverlay(container);

            const emptyMessage = container.querySelector('.empty-message');
            expect(emptyMessage?.textContent).toContain('No team scores yet');
        });

        it('should render top 10 team scores in descending order', () => {
            // Mock localStorage with team scores
            const mockScores = [
                { player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() },
                { player1Name: 'Charlie', player2Name: 'Dave', totalScore: 4500, scoreP1: 2500, scoreP2: 2000, linesP1: 12, linesP2: 11, timestamp: Date.now() },
                { player1Name: 'Eve', player2Name: 'Frank', totalScore: 3000, scoreP1: 1500, scoreP2: 1500, linesP1: 8, linesP2: 7, timestamp: Date.now() }
            ];
            localStorage.setItem('tetris_coop_leaderboard', JSON.stringify(mockScores));

            createTeamLeaderboardOverlay(container);

            const rows = container.querySelectorAll('.leaderboard-row');
            expect(rows.length).toBe(3);

            // Check first row (highest score)
            const firstRow = rows[0];
            expect(firstRow.textContent).toContain('Alice');
            expect(firstRow.textContent).toContain('Bob');
            expect(firstRow.textContent).toContain('5000');
        });

        it('should include Close button that removes overlay', () => {
            createTeamLeaderboardOverlay(container);

            const closeButton = container.querySelector('.close-btn') as HTMLButtonElement;
            expect(closeButton).toBeTruthy();
            expect(closeButton.textContent).toContain('Close');

            // Click close button
            closeButton.click();

            // Overlay should be removed
            const overlay = container.querySelector('.leaderboard-overlay');
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
        it('should show individual scores (P1 and P2) for each team', () => {
            const mockScores = [
                { player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() }
            ];
            localStorage.setItem('tetris_coop_leaderboard', JSON.stringify(mockScores));

            createTeamLeaderboardOverlay(container);

            const row = container.querySelector('.leaderboard-row');
            expect(row?.textContent).toContain('3000'); // P1 score
            expect(row?.textContent).toContain('2000'); // P2 score
        });

        it('should display lines cleared for each player', () => {
            const mockScores = [
                { player1Name: 'Alice', player2Name: 'Bob', totalScore: 5000, scoreP1: 3000, scoreP2: 2000, linesP1: 15, linesP2: 10, timestamp: Date.now() }
            ];
            localStorage.setItem('tetris_coop_leaderboard', JSON.stringify(mockScores));

            createTeamLeaderboardOverlay(container);

            const row = container.querySelector('.leaderboard-row');
            expect(row?.textContent).toContain('15'); // P1 lines
            expect(row?.textContent).toContain('10'); // P2 lines
        });
    });
});
