/**
 * LeaderboardService - Manages high scores in localStorage
 * 
 * Features:
 * - Store top 10 scores per game mode (Solo / Special)
 * - Persist to localStorage
 * - Sort by score descending
 */

import { db } from '~/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export type GameMode = 'solo' | 'special' | 'duo' | 'online'

export interface LeaderboardEntry {
    id: string    // Unique ID for update capability
    playerName: string
    score: number
    level: number
    lines: number
    date: string  // ISO date string
    hasIncreaseGravity?: boolean // Optional for backward compatibility
}

export interface DuoMatchResult {
    id: string
    date: string
    winner: 'p1' | 'p2'
    p1: { name: string; score: number }
    p2: { name: string; score: number }
}

export interface OnlineMatchResult {
    id: string
    date: string
    gameMode: 'online' | 'lan'  // Distinguish between Online and LAN
    isWinner: boolean
    isDraw?: boolean            // NEW: Explicit Draw state
    playerName: string
    opponentName: string
    winScore: number | null     // Score at time of winning (null if lost)
    maxScore: number            // Max score (after continue playing)
    opponentScore: number       // Opponent's final score
    duration: number            // Game duration in seconds
    matchId?: string            // Server-assigned match ID (optional for backward compatibility)
}

export class LeaderboardService {
    private static STORAGE_KEY_PREFIX = 'tetris-leaderboard-'
    private static STORAGE_KEY_DUO_SESSIONS = 'tetris-leaderboard-duo-sessions'
    private static MAX_ENTRIES = 10

    private static getStorageKey(mode: GameMode): string {
        if (mode === 'duo') return this.STORAGE_KEY_DUO_SESSIONS
        return `${this.STORAGE_KEY_PREFIX}${mode}`
    }

    /**
     * Get all leaderboard entries for a mode, sorted by score descending
     */
    static getLeaderboard(mode: GameMode = 'solo'): LeaderboardEntry[] {
        if (mode === 'duo') return [] // Duo uses getDuoLeaderboard instead

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
    /**
     * Generate a UUID (v4) with fallback for environments where crypto.randomUUID is undefined
     */
    private static generateUUID(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID()
        }
        // Fallback for older browsers / insecure contexts
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0
            const v = c === 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }

    static addScore(entry: Omit<LeaderboardEntry, 'id'>, mode: GameMode = 'solo'): { rank: number | null, id: string | null } {
        const leaderboard = this.getLeaderboard(mode)
        const id = this.generateUUID()
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

        // Fire & Forget upload to Firestore
        this.uploadScoreToFirestore(newEntry, mode).catch(err => console.error('[Leaderboard] Upload failed', err))

        return { rank, id }
    }

    private static async uploadScoreToFirestore(entry: LeaderboardEntry, mode: GameMode) {
        if (!db) {
            console.warn('[Leaderboard] Firestore not initialized')
            return
        }
        try {
            console.log(`[Leaderboard] Attempting to upload to leaderboard_${mode}...`, entry)
            const colRef = collection(db, `leaderboard_${mode}`)
            const docRef = await addDoc(colRef, {
                ...entry,
                createdAt: serverTimestamp()
            })
            console.log(`[Leaderboard] ✅ Success! Document written with ID: ${docRef.id} to leaderboard_${mode}`)
        } catch (e) {
            console.error(`[Leaderboard] ❌ Firestore Error (leaderboard_${mode}):`, e)
            if (e instanceof Error) {
                console.error('Error details:', e.message, e.stack)
            }
        }
    }

    /**
     * Update player name for an existing entry by ID
     */
    static updateEntryName(id: string, newName: string, mode: GameMode = 'solo'): boolean {
        const leaderboard = this.getLeaderboard(mode)
        const entryIndex = leaderboard.findIndex(e => e.id === id)

        if (entryIndex !== -1 && leaderboard[entryIndex]) {
            leaderboard[entryIndex]!.playerName = newName
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

    // ==========================================
    // Duo Session Methods
    // ==========================================

    static getDuoLeaderboard(): DuoMatchResult[] {
        if (typeof localStorage === 'undefined') return []

        const data = localStorage.getItem(this.STORAGE_KEY_DUO_SESSIONS)
        if (!data) return []

        try {
            return JSON.parse(data)
        } catch {
            return []
        }
    }

    static addDuoMatch(result: Omit<DuoMatchResult, 'id'>): DuoMatchResult {
        const history = this.getDuoLeaderboard()
        const id = this.generateUUID()
        const newMatch: DuoMatchResult = { ...result, id }

        history.unshift(newMatch) // Add to top (newest first)

        // Keep last 50 matches
        if (history.length > 50) {
            history.pop()
        }

        localStorage.setItem(this.STORAGE_KEY_DUO_SESSIONS, JSON.stringify(history))

        // Upload
        this.uploadDuoMatchToFirestore(newMatch).catch(console.error)

        return newMatch
    }

    private static async uploadDuoMatchToFirestore(match: DuoMatchResult) {
        if (!db) {
            console.warn('[Leaderboard] Firestore not initialized (Duo)')
            return
        }
        try {
            console.log('[Leaderboard] Uploading Duo Match...', match)
            const colRef = collection(db, 'leaderboard_duo_matches')
            const docRef = await addDoc(colRef, {
                ...match,
                createdAt: serverTimestamp()
            })
            console.log(`[Leaderboard] ✅ Duo Match uploaded! ID: ${docRef.id}`)
        } catch (e) {
            console.error('[Leaderboard] ❌ Duo Upload Error:', e)
        }
    }

    // ==========================================
    // Online Match Methods
    // ==========================================

    private static STORAGE_KEY_ONLINE_MATCHES = 'tetris-leaderboard-online-matches'

    static getOnlineLeaderboard(): OnlineMatchResult[] {
        if (typeof localStorage === 'undefined') return []

        const data = localStorage.getItem(this.STORAGE_KEY_ONLINE_MATCHES)
        if (!data) return []

        try {
            return JSON.parse(data)
        } catch {
            return []
        }
    }

    static addOnlineMatch(result: Omit<OnlineMatchResult, 'id'>): OnlineMatchResult {
        const history = this.getOnlineLeaderboard()
        const id = this.generateUUID()
        const newMatch: OnlineMatchResult = { ...result, id }

        history.unshift(newMatch) // Add to top (newest first)

        // Keep last 50 matches
        if (history.length > 50) {
            history.pop()
        }

        localStorage.setItem(this.STORAGE_KEY_ONLINE_MATCHES, JSON.stringify(history))

        // Upload
        this.uploadOnlineMatchToFirestore(newMatch).catch(console.error)

        return newMatch
    }

    private static async uploadOnlineMatchToFirestore(match: OnlineMatchResult) {
        if (!db) {
            console.warn('[Leaderboard] Firestore not initialized (Online)')
            return
        }
        try {
            console.log('[Leaderboard] Uploading Online Match...', match)
            const colRef = collection(db, 'leaderboard_online_matches')
            const docRef = await addDoc(colRef, {
                ...match,
                createdAt: serverTimestamp()
            })
            console.log(`[Leaderboard] ✅ Online Match uploaded! ID: ${docRef.id}`)
        } catch (e) {
            console.error('[Leaderboard] ❌ Online Upload Error:', e)
        }
    }

    static updateOnlineMatch(id: string, updates: Partial<Omit<OnlineMatchResult, 'id'>>): boolean {
        const history = this.getOnlineLeaderboard()
        const index = history.findIndex(m => m.id === id)

        const entry = history[index]
        if (index !== -1 && entry) {
            history[index] = { ...entry, ...updates }
            localStorage.setItem(this.STORAGE_KEY_ONLINE_MATCHES, JSON.stringify(history))
            return true
        }
        return false
    }

    static clearOnlineMatches(): void {
        localStorage.removeItem(this.STORAGE_KEY_ONLINE_MATCHES)
    }
}



