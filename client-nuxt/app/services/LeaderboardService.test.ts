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
            localStorage.setItem('tetris-solo-leaderboard', JSON.stringify(entries))

            const leaderboard = LeaderboardService.getLeaderboard()

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

            const rank = LeaderboardService.addScore(entry)

            expect(rank).toBe(1)
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
            const rank = LeaderboardService.addScore({
                playerName: 'NewPlayer',
                score: 3000,
                level: 3,
                lines: 30,
                date: '2024-01-02',
            })

            expect(rank).toBe(2)
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
            const rank = LeaderboardService.addScore({
                playerName: 'LowScore',
                score: 100,
                level: 1,
                lines: 1,
                date: '2024-01-01',
            })

            expect(rank).toBeNull()
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
            const rank = LeaderboardService.addScore({
                playerName: 'MiddlePlayer',
                score: 5500,
                level: 5,
                lines: 55,
                date: '2024-01-02',
            })

            expect(rank).toBe(6) // 10000, 9000, 8000, 7000, 6000, 5500, ...

            const leaderboard = LeaderboardService.getLeaderboard()
            expect(leaderboard).toHaveLength(10)
            expect(leaderboard.find(e => e.score === 1000)).toBeUndefined() // Lowest pushed out
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
})
