/**
 * LeaderboardService - Manages high scores in localStorage
 * 
 * Features:
 * - Store top 10 scores per game mode (Solo / Special)
 * - Persist to localStorage
 * - Sort by score descending
 */

export type GameMode = 'solo' | 'special'

export interface LeaderboardEntry {
    playerName: string
    score: number
    level: number
    lines: number
    date: string  // ISO date string
}

export class LeaderboardService {
    private static STORAGE_KEY_PREFIX = 'tetris-leaderboard-'
    private static MAX_ENTRIES = 10

    private static getStorageKey(mode: GameMode): string {
        return `${this.STORAGE_KEY_PREFIX}${mode}`
    }

    /**
     * Get all leaderboard entries for a mode, sorted by score descending
     */
    static getLeaderboard(mode: GameMode = 'solo'): LeaderboardEntry[] {
        const data = localStorage.getItem(this.getStorageKey(mode))
        if (!data) return []

        try {
            const entries: LeaderboardEntry[] = JSON.parse(data)
            return entries.sort((a, b) => b.score - a.score)
        } catch {
            return []
        }
    }

    /**
     * Add a new score to the leaderboard
     * Returns the rank (1-10) if added, null if score didn't qualify
     */
    static addScore(entry: LeaderboardEntry, mode: GameMode = 'solo'): number | null {
        const leaderboard = this.getLeaderboard(mode)

        // Check if score qualifies
        if (leaderboard.length >= this.MAX_ENTRIES) {
            const lowestScore = leaderboard[leaderboard.length - 1]!.score
            if (entry.score <= lowestScore) {
                return null
            }
        }

        // Add entry and sort
        leaderboard.push(entry)
        leaderboard.sort((a, b) => b.score - a.score)

        // Limit to MAX_ENTRIES
        const trimmed = leaderboard.slice(0, this.MAX_ENTRIES)

        // Save to localStorage
        localStorage.setItem(this.getStorageKey(mode), JSON.stringify(trimmed))

        // Find and return rank
        const rank = trimmed.findIndex(e => e === entry) + 1
        return rank > 0 ? rank : null
    }

    /**
     * Check if a score qualifies for the leaderboard
     */
    static isHighScore(score: number, mode: GameMode = 'solo'): boolean {
        const leaderboard = this.getLeaderboard(mode)

        // If leaderboard not full, any score qualifies
        if (leaderboard.length < this.MAX_ENTRIES) {
            return true
        }

        // Otherwise, must beat the lowest score
        const lowestScore = leaderboard[leaderboard.length - 1]!.score
        return score > lowestScore
    }

    /**
     * Clear leaderboard entries for a mode (or all if no mode specified)
     */
    static clear(mode?: GameMode): void {
        if (mode) {
            localStorage.removeItem(this.getStorageKey(mode))
        } else {
            localStorage.removeItem(this.getStorageKey('solo'))
            localStorage.removeItem(this.getStorageKey('special'))
        }
    }
}

