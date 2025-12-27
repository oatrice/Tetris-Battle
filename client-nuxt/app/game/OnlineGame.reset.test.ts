/**
 * Test to verify that OnlineGame states are properly reset
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OnlineGame } from './OnlineGame'
import { socketService } from '~/services/SocketService'

// Mock socketService
vi.mock('~/services/SocketService', () => ({
    socketService: {
        connect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        send: vi.fn(),
        disconnect: vi.fn()
    }
}))

describe('OnlineGame Reset Logic', () => {
    let game: OnlineGame

    beforeEach(() => {
        game = new OnlineGame()
        game.init('ws://test')
    })

    it('should reset isWinner, isDraw, and opponentGameOver flags on reset()', () => {
        // Simulate a game end state
        game.isWinner = true
        game.isDraw = false
        game.opponentGameOver = true
        game.winScore = 5000
        game.score = 6000
        game.isGameOver = true

        // Call reset
        game.reset()

        // Assert all flags are cleared
        expect(game.isWinner).toBe(false)
        expect(game.isDraw).toBe(false)
        expect(game.opponentGameOver).toBe(false)
        expect(game.winScore).toBeNull()

        // Assert game state cleared
        expect(game.isGameOver).toBe(false)
        expect(game.score).toBe(0)
    })
})
