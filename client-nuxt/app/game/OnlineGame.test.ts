/**
 * OnlineGame Test - Tests for game_over event handling
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock socketService before importing OnlineGame
const mockListeners = new Map<string, Function[]>()

vi.mock('~/services/SocketService', () => ({
    socketService: {
        connect: vi.fn().mockResolvedValue(undefined),
        on: (event: string, handler: Function) => {
            if (!mockListeners.has(event)) {
                mockListeners.set(event, [])
            }
            mockListeners.get(event)!.push(handler)
        },
        send: vi.fn(),
        disconnect: vi.fn()
    }
}))

// Import after mock
import { OnlineGame } from './OnlineGame'

// Helper to trigger mock events
const triggerEvent = (event: string, payload?: any) => {
    const handlers = mockListeners.get(event) || []
    handlers.forEach(h => h(payload))
}

describe('OnlineGame game_over handling', () => {
    let game: OnlineGame

    beforeEach(() => {
        mockListeners.clear()
        game = new OnlineGame()
        game.init('ws://localhost:8080/ws')
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('receiving game_over event', () => {
        it('should set isWinner=true when opponent loses (and self not game over)', () => {
            // Precondition: self is still playing
            expect(game.isGameOver).toBe(false)

            // Opponent loses
            triggerEvent('game_over')

            expect(game.isWinner).toBe(true)
            expect(game.opponentGameOver).toBe(true)
            expect(game.isDraw).toBe(false)
            expect(game.isPaused).toBe(true)
            expect(game.winScore).toBe(game.score)
        })

        it('should set isDraw=true when both players game over simultaneously', () => {
            // Precondition: self already game over
            game.isGameOver = true

            // Then receive opponent game_over
            triggerEvent('game_over')

            expect(game.isDraw).toBe(true)
            expect(game.isWinner).toBe(false)
            expect(game.opponentGameOver).toBe(true)
        })

        it('should not process game_over twice (guard check)', () => {
            // First game_over
            triggerEvent('game_over')
            expect(game.isWinner).toBe(true)

            // Attempt second game_over
            game.score = 9999 // Change score to verify it doesn't update
            triggerEvent('game_over')

            // winScore should still be original (0), not 9999
            expect(game.winScore).toBe(0)
        })

        it('should not set isWinner if already isDraw', () => {
            // Set up draw state
            game.isDraw = true

            triggerEvent('game_over')

            expect(game.isWinner).toBe(false) // Should remain false
        })

        it('should record winScore at moment of winning', () => {
            // Set up a score before winning
            game.score = 5000

            triggerEvent('game_over')

            expect(game.winScore).toBe(5000)
        })
    })
})
