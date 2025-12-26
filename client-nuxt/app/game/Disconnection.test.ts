
import { describe, it, expect, vi } from 'vitest'
import { OnlineGame } from './OnlineGame'
import { socketService } from '~/services/SocketService'

describe('OnlineGame Disconnection Logic', () => {
    it('should handle opponent disconnecting while we are winning', () => {
        // [SCENARIO] 
        // 1. We win the game (opponent game over)
        // 2. We see "You Win" and "Continue Playing" button
        // 3. Opponent disconnects (rage quit?)
        // 4. We click "Continue Playing"
        // EXPECTATION: We should still be able to continue playing solo

        // Mock socket callbacks
        const callbacks: Record<string, Function> = {}
        vi.spyOn(socketService, 'on').mockImplementation((event, cb) => {
            callbacks[event] = cb
        })

        const game = new OnlineGame()
        game.init('ws://localhost:3000')

        // 1. Start game state
        game.isWinner = true
        game.isPaused = true // Paused for win screen
        game.isOpponentConnected = true

        // 2. Opponent disconnects
        // Trigger 'player_left' event
        if (callbacks['player_left']) {
            callbacks['player_left']()
        }

        // Current behavior check: does it force game over?
        // If opponent disconnects, 'player_left' should NOT set isGameOver=true if isWinner=true
        expect(game.isGameOver).toBe(false)
        expect(game.isOpponentConnected).toBe(false)

        // 3. User tries to continue
        game.continueAfterWin()

        // 4. Verification
        // If isGameOver is true, user can't really "continue" playing normally 
        // because the game loop checks for !isGameOver.
        // Also continueAfterWin() sets isPaused=false, but doesn't reset isGameOver.

        // If we want to allow continuing for high score, we shouldn't force Game Over 
        // IF we have already won.

        expect(game.isPaused).toBe(false)
        expect(game.isGameOver).toBe(false) // This FAILs currently because player_left enforces game over
    })
})
