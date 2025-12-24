/**
 * LeaderboardService - Manages high scores in localStorage
 * 
 * Features:
 * - Store top 10 scores
 * - Persist to localStorage
 * - Sort by score descending
 */

export interface LeaderboardEntry {
    playerName: string
    score: number
    level: number
    lines: number
    date: string  // ISO date string
}

export class LeaderboardService {
    private static STORAGE_KEY = 'tetris-solo-leaderboard'
    private static MAX_ENTRIES = 10

    /**
     * Get all leaderboard entries sorted by score descending
     */
    static getLeaderboard(): LeaderboardEntry[] {
        const data = localStorage.getItem(this.STORAGE_KEY)
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
    static addScore(entry: LeaderboardEntry): number | null {
        const leaderboard = this.getLeaderboard()

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
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed))

        // Find and return rank
        const rank = trimmed.findIndex(e => e === entry) + 1
        return rank > 0 ? rank : null
    }

    /**
     * Check if a score qualifies for the leaderboard
     */
    static isHighScore(score: number): boolean {
        const leaderboard = this.getLeaderboard()

        // If leaderboard not full, any score qualifies
        if (leaderboard.length < this.MAX_ENTRIES) {
            return true
        }

        // Otherwise, must beat the lowest score
        const lowestScore = leaderboard[leaderboard.length - 1]!.score
        return score > lowestScore
    }

    /**
     * Clear all leaderboard entries
     */
    static clear(): void {
        localStorage.removeItem(this.STORAGE_KEY)
    }
}
