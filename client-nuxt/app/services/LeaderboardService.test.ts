/**
 * 🔴 RED Phase: LeaderboardService Test
 * Failing tests for LeaderboardService class - manages high scores in localStorage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LeaderboardService, type LeaderboardEntry } from './LeaderboardService'

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value },
        removeItem: (key: string) => { delete store[key] },
        clear: () => { store = {} },
    }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('LeaderboardService', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    describe('getLeaderboard', () => {
        it('should return empty array when no scores exist', () => {
            const leaderboard = LeaderboardService.getLeaderboard()

            expect(leaderboard).toEqual([])
        })

        it('should return saved scores sorted by score descending', () => {
            const entries: LeaderboardEntry[] = [
                { playerName: 'Alice', score: 1000, level: 2, lines: 10, date: '2024-01-01' },
                { playerName: 'Bob', score: 2000, level: 4, lines: 20, date: '2024-01-02' },
            ]
            localStorage.setItem('tetris-leaderboard-solo', JSON.stringify(entries))

            const leaderboard = LeaderboardService.getLeaderboard('solo')

            expect(leaderboard[0]!.playerName).toBe('Bob')
            expect(leaderboard[1]!.playerName).toBe('Alice')
        })
    })

    describe('addScore', () => {
        it('should add score and return rank 1 for first entry', () => {
            const entry: LeaderboardEntry = {
                playerName: 'Player1',
                score: 1000,
                level: 2,
                lines: 10,
                date: '2024-01-01',
            }

            const result = LeaderboardService.addScore(entry)

            expect(result.rank).toBe(1)
            expect(result.id).toBeTruthy()
            expect(LeaderboardService.getLeaderboard()).toHaveLength(1)
        })

        it('should return correct rank when adding to existing scores', () => {
            // Add initial high score
            LeaderboardService.addScore({
                playerName: 'TopPlayer',
                score: 5000,
                level: 5,
                lines: 50,
                date: '2024-01-01',
            })

            // Add lower score
            const result = LeaderboardService.addScore({
                playerName: 'NewPlayer',
                score: 3000,
                level: 3,
                lines: 30,
                date: '2024-01-02',
            })

            expect(result.rank).toBe(2)
        })

        it('should limit leaderboard to 10 entries', () => {
            // Add 10 entries
            for (let i = 0; i < 10; i++) {
                LeaderboardService.addScore({
                    playerName: `Player${i}`,
                    score: (i + 1) * 1000,
                    level: i + 1,
                    lines: (i + 1) * 10,
                    date: '2024-01-01',
                })
            }

            // Add 11th entry with lower score than all others
            const result = LeaderboardService.addScore({
                playerName: 'LowScore',
                score: 100,
                level: 1,
                lines: 1,
                date: '2024-01-01',
            })

            expect(result.rank).toBeNull()
            expect(result.id).toBeNull()
            expect(LeaderboardService.getLeaderboard()).toHaveLength(10)
        })

        it('should add high score and push out lowest score when board is full', () => {
            // Add 10 entries with scores 1000-10000
            for (let i = 0; i < 10; i++) {
                LeaderboardService.addScore({
                    playerName: `Player${i}`,
                    score: (i + 1) * 1000,
                    level: i + 1,
                    lines: (i + 1) * 10,
                    date: '2024-01-01',
                })
            }

            // Add entry with score between existing scores
            const result = LeaderboardService.addScore({
                playerName: 'MiddlePlayer',
                score: 5500,
                level: 5,
                lines: 55,
                date: '2024-01-02',
            })

            expect(result.rank).toBe(6) // 10000, 9000, 8000, 7000, 6000, 5500, ...
            expect(result.id).toBeTruthy()

            const leaderboard = LeaderboardService.getLeaderboard()
            expect(leaderboard).toHaveLength(10)
            expect(leaderboard.find(e => e.score === 1000)).toBeUndefined() // Lowest pushed out
        })
    })

    describe('getPotentialRank', () => {
        it('should return 1 for empty leaderboard', () => {
            expect(LeaderboardService.getPotentialRank(100)).toBe(1)
        })

        it('should return 1 for new highest score', () => {
            LeaderboardService.addScore({ playerName: 'P1', score: 1000, level: 1, lines: 1, date: '2024-01-01' })
            expect(LeaderboardService.getPotentialRank(2000)).toBe(1)
        })

        it('should return correct rank for middle score', () => {
            LeaderboardService.addScore({ playerName: 'P1', score: 3000, level: 1, lines: 1, date: '2024-01-01' })
            LeaderboardService.addScore({ playerName: 'P2', score: 1000, level: 1, lines: 1, date: '2024-01-01' })

            // 3000, 1000 -> 2000 should be rank 2 (insert between 3000 and 1000)
            // Wait, logic:
            // 3000 (Rank 1)
            // 2000 (Rank 2) -> New
            // 1000 (Rank 3)
            expect(LeaderboardService.getPotentialRank(2000)).toBe(2)
        })

        it('should return 11 (Max+1) for score too low when full', () => {
            for (let i = 0; i < 10; i++) {
                LeaderboardService.addScore({ playerName: `P${i}`, score: (i + 1) * 1000, level: 1, lines: 1, date: '2024-01-01' })
            }
            // Lowest is 1000
            expect(LeaderboardService.getPotentialRank(500)).toBe(11)
        })
    })

    describe('isHighScore', () => {
        it('should return true when leaderboard is empty', () => {
            expect(LeaderboardService.isHighScore(1)).toBe(true)
        })

        it('should return true when score beats lowest entry and board is full', () => {
            // Fill board with scores 1000-10000
            for (let i = 0; i < 10; i++) {
                LeaderboardService.addScore({
                    playerName: `Player${i}`,
                    score: (i + 1) * 1000,
                    level: 1,
                    lines: 10,
                    date: '2024-01-01',
                })
            }

            expect(LeaderboardService.isHighScore(1500)).toBe(true)
            expect(LeaderboardService.isHighScore(500)).toBe(false)
        })

        it('should return true when leaderboard is not full', () => {
            LeaderboardService.addScore({
                playerName: 'Player1',
                score: 5000,
                level: 1,
                lines: 10,
                date: '2024-01-01',
            })

            expect(LeaderboardService.isHighScore(100)).toBe(true) // Even low score qualifies
        })

        it('should return false for zero or negative scores', () => {
            expect(LeaderboardService.isHighScore(0)).toBe(false)
            expect(LeaderboardService.isHighScore(-100)).toBe(false)
        })
    })

    describe('clear', () => {
        it('should remove all entries', () => {
            LeaderboardService.addScore({
                playerName: 'Player1',
                score: 1000,
                level: 1,
                lines: 10,
                date: '2024-01-01',
            })

            LeaderboardService.clear()

            expect(LeaderboardService.getLeaderboard()).toEqual([])
        })
    })

    describe('mode separation', () => {
        it('should store solo and special scores separately', () => {
            LeaderboardService.addScore({
                playerName: 'SoloPlayer',
                score: 1000,
                level: 1,
                lines: 10,
                date: '2024-01-01',
            }, 'solo')

            LeaderboardService.addScore({
                playerName: 'SpecialPlayer',
                score: 2000,
                level: 2,
                lines: 20,
                date: '2024-01-01',
            }, 'special')

            const soloBoard = LeaderboardService.getLeaderboard('solo')
            const specialBoard = LeaderboardService.getLeaderboard('special')

            expect(soloBoard).toHaveLength(1)
            expect(soloBoard[0]!.playerName).toBe('SoloPlayer')
            expect(specialBoard).toHaveLength(1)
            expect(specialBoard[0]!.playerName).toBe('SpecialPlayer')
        })

        it('should check high score per mode', () => {
            // Fill solo leaderboard
            for (let i = 0; i < 10; i++) {
                LeaderboardService.addScore({
                    playerName: `Player${i}`,
                    score: (i + 1) * 1000,
                    level: 1,
                    lines: 10,
                    date: '2024-01-01',
                }, 'solo')
            }

            // Special leaderboard is empty
            expect(LeaderboardService.isHighScore(500, 'solo')).toBe(false)
            expect(LeaderboardService.isHighScore(500, 'special')).toBe(true)
        })

        it('should clear specific mode only', () => {
            LeaderboardService.addScore({
                playerName: 'SoloPlayer',
                score: 1000,
                level: 1,
                lines: 10,
                date: '2024-01-01',
            }, 'solo')

            LeaderboardService.addScore({
                playerName: 'SpecialPlayer',
                score: 2000,
                level: 2,
                lines: 20,
                date: '2024-01-01',
            }, 'special')

            LeaderboardService.clear('solo')

            expect(LeaderboardService.getLeaderboard('solo')).toEqual([])
            expect(LeaderboardService.getLeaderboard('special')).toHaveLength(1)
        })

        it('should return empty list for duo mode in standard getLeaderboard', () => {
            const leaderboard = LeaderboardService.getLeaderboard('duo')
            expect(leaderboard).toEqual([])
        })
    })

    describe('addDuoMatch', () => {
        beforeEach(() => {
            LeaderboardService.clear('duo')
        })

        it('should add a duo match result', () => {
            const result = LeaderboardService.addDuoMatch({
                date: '2024-01-01',
                winner: 'p1',
                p1: { name: 'Player 1', score: 1000 },
                p2: { name: 'Player 2', score: 500 }
            })

            expect(result.id).toBeTruthy()
            expect(result.winner).toBe('p1')

            const history = LeaderboardService.getDuoLeaderboard()
            expect(history).toHaveLength(1)
            expect(history[0].p1.name).toBe('Player 1')
        })

        it('should keep history sorted by newest first (unshift)', () => {
            LeaderboardService.addDuoMatch({
                date: '2024-01-01',
                winner: 'p1',
                p1: { name: 'Old', score: 1000 },
                p2: { name: 'Player 2', score: 500 }
            })

            LeaderboardService.addDuoMatch({
                date: '2024-01-02',
                winner: 'p2',
                p1: { name: 'New', score: 2000 },
                p2: { name: 'Player 2', score: 1500 }
            })

            const history = LeaderboardService.getDuoLeaderboard()
            expect(history).toHaveLength(2)
            expect(history[0].p1.name).toBe('New') // Newest first
            expect(history[1].p1.name).toBe('Old')
        })
    })
})
