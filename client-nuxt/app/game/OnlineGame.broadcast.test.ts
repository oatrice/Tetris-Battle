
/**
 * Reproduction Test for LAN Draw Bug
 * Scenario: Winner continues playing alone, then eventually dies.
 * Bug: Winner sends 'game_over' to Loser. Loser sees this and thinks it's a 'Draw'.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock socketService
const { mockSend, mockListeners } = vi.hoisted(() => {
    return {
        mockSend: vi.fn(),
        mockListeners: new Map<string, Function[]>()
    }
})

vi.mock('~/services/SocketService', () => ({
    socketService: {
        connect: vi.fn().mockResolvedValue(undefined),
        on: (event: string, handler: Function) => {
            if (!mockListeners.has(event)) {
                mockListeners.set(event, [])
            }
            mockListeners.get(event)!.push(handler)
        },
        send: mockSend,
        disconnect: vi.fn()
    }
}))

import { OnlineGame } from './OnlineGame'
import { socketService } from '~/services/SocketService'

// Helper to trigger mock events
const triggerEvent = (event: string, payload?: any) => {
    const handlers = mockListeners.get(event) || []
    handlers.forEach(h => h(payload))
}

describe('Reproduce LAN Draw Bug', () => {
    let game: OnlineGame

    beforeEach(() => {
        mockListeners.clear()
        mockSend.mockClear()
        game = new OnlineGame()
        game.init('ws://localhost:8080/ws')

        // Simulate game start
        triggerEvent('game_start', {
            opponentId: 'op1',
            opponentName: 'Opponent',
            matchId: 'match-1'
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('BUG: specific case where winner continues playing calls game_over again', () => {
        // 1. Unrelated initialization
        expect(game.isWinner).toBe(false)
        expect(game.isGameOver).toBe(false)

        // 2. Opponent loses (sends game_over)
        triggerEvent('game_over')

        // 3. We are now the Winner
        expect(game.isWinner).toBe(true)
        expect(game.isGameOver).toBe(false) // We are still alive

        // 4. Winner continues playing (solo)
        // Simulate playing until death
        game.isGameOver = true

        // 5. Broadcast state (would happen in lockPiece)
        game.broadcastState()

        // 6. Check if 'game_over' message was sent
        // BUG: It SHOULD sends 'game_over' currently, which causes the bug on the other side.
        // The fix should be: EXPECT it NOT to send 'game_over' if we are already winner.

        const calls = mockSend.mock.calls
        const sentGameOver = calls.some(call => call[0] === 'game_over')

        // Assert that the bug IS FIXED (it does NOT send game_over)
        expect(sentGameOver).toBe(false)
    })
})
