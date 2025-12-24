
export interface DuoStats {
    p1Wins: number
    p2Wins: number
}

export class DuoStatsService {
    private static STORAGE_KEY = 'tetris-duo-stats'

    static getStats(): DuoStats {
        if (typeof localStorage === 'undefined') {
            return { p1Wins: 0, p2Wins: 0 }
        }

        const data = localStorage.getItem(this.STORAGE_KEY)
        if (!data) return { p1Wins: 0, p2Wins: 0 }

        try {
            return JSON.parse(data)
        } catch {
            return { p1Wins: 0, p2Wins: 0 }
        }
    }

    static incrementWin(winner: 1 | 2): DuoStats {
        const stats = this.getStats()
        if (winner === 1) stats.p1Wins++
        if (winner === 2) stats.p2Wins++

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats))
        return stats
    }

    static resetStats(): DuoStats {
        const stats = { p1Wins: 0, p2Wins: 0 }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats))
        return stats
    }
}
