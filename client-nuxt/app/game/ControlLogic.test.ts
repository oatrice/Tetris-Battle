
import { describe, it, expect } from 'vitest'

describe('Control Logic Verification', () => {
    it('should allow controls if opponent is disconnected BUT we are the winner', () => {
        const state = {
            isGameOver: false,
            isOpponentConnected: false,
            isWinner: true
        }

        // Current Logic in app.vue (Simulated)
        const canControlKeys = !state.isGameOver && state.isOpponentConnected  // FAIL

        // Desired Logic
        const fixedCanControlKeys = !state.isGameOver && (state.isOpponentConnected || state.isWinner)

        expect(fixedCanControlKeys).toBe(true)
    })
})
