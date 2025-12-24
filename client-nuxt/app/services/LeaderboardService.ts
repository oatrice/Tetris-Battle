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
    id: string    // Unique ID for update capability
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
     * Add a score to the leaderboard.
     * Returns the rank of the new score (1-10), or null if not in top 10.
     * Returns the ID of the new entry as well if needed (tuple would be better but let's stick to rank for now, 
     * actually we need ID now. Let's return object)
     */
    static addScore(entry: Omit<LeaderboardEntry, 'id'>, mode: GameMode = 'solo'): { rank: number | null, id: string | null } {
        const leaderboard = this.getLeaderboard(mode)
        const id = crypto.randomUUID()
        const newEntry: LeaderboardEntry = { ...entry, id }

        leaderboard.push(newEntry)
        leaderboard.sort((a, b) => b.score - a.score)

        if (leaderboard.length > this.MAX_ENTRIES) {
            leaderboard.pop() // Remove lowest score
        }

        const rank = leaderboard.findIndex(e => e.id === id) + 1

        // If rank is 0 (not found? shouldn't happen unless popped) or > MAX_ENTRIES (popped)
        if (rank === 0) {
            return { rank: null, id: null }
        }

        localStorage.setItem(this.getStorageKey(mode), JSON.stringify(leaderboard))
        return { rank, id }
    }

    /**
     * Update player name for an existing entry by ID
     */
    static updateEntryName(id: string, newName: string, mode: GameMode = 'solo'): boolean {
        const leaderboard = this.getLeaderboard(mode)
        const entryIndex = leaderboard.findIndex(e => e.id === id)

        if (entryIndex !== -1) {
            leaderboard[entryIndex].playerName = newName
            localStorage.setItem(this.getStorageKey(mode), JSON.stringify(leaderboard))
            return true
        }
        return false
    }

    /**
     * Check rank for a score (returns 1-11, where 11 means not on leaderboard)
     */
    static getPotentialRank(score: number, mode: GameMode = 'solo'): number {
        if (score <= 0) return this.MAX_ENTRIES + 1

        const leaderboard = this.getLeaderboard(mode)

        // If empty, it's rank 1
        if (leaderboard.length === 0) return 1

        // Find position where score is greater
        const index = leaderboard.findIndex(entry => score > entry.score)

        if (index !== -1) {
            return index + 1
        }

        // If not found better, check if slots available
        if (leaderboard.length < this.MAX_ENTRIES) {
            return leaderboard.length + 1
        }

        return this.MAX_ENTRIES + 1
    }

    /**
     * Check if a score qualifies for the leaderboard
     */
    static isHighScore(score: number, mode: GameMode = 'solo'): boolean {
        return this.getPotentialRank(score, mode) <= this.MAX_ENTRIES
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

