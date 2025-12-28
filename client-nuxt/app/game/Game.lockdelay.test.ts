import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from './Game'

describe('Game Lock Delay', () => {
    let game: Game

    beforeEach(() => {
        game = new Game()
    })

    it('should NOT lock piece immediately when hitting bottom', () => {
        const oldPiece = game.currentPiece

        // Move piece all the way down
        // We manually force it down until moveDown returns false
        while (game.moveDown()) { }

        // At this point, in the old logic, it would have locked and spawned a new piece
        // In the new logic, it should still be the same piece (waiting for lock delay)
        expect(game.currentPiece).toBe(oldPiece)
    })

    it('should lock piece after 500ms delay at bottom', () => {
        const oldPiece = game.currentPiece
        while (game.moveDown()) { }

        // Update with small time step - should not lock yet
        // @ts-ignore
        game.update(200)
        expect(game.currentPiece).toBe(oldPiece)

        // Update with more time to exceed 500ms
        // @ts-ignore
        game.update(350) // Total 550ms

        // Now it should be locked and replaced
        expect(game.currentPiece).not.toBe(oldPiece)
    })

    it('should reset lock timer if piece falls further (e.g. sliding off ledge)', () => {
        // Setup: Create a scenario where piece lands, waits a bit, then moves to a gap and falls
        // This requires manipulating the board to have a ledge
        // [ ][ ]
        // [X][ ]
        // [X][ ]

        // We'll mimic this by teleporting the piece for simplicity or just mocks
        // But for integration test, let's just use the fact that if 'isFloating', timer resets.

        const oldPiece = game.currentPiece
        while (game.moveDown()) { }

        // It is at bottom. Timer starts.
        // @ts-ignore
        game.update(300)

        // Now suppose we move it up (cheat) or it somehow becomes floating
        // We can just manually move it up for the test to simulate "falling ability restored"
        game.currentPiece.move(0, -1) // Move back up

        // Now it CAN move down. Update should reset timer.
        // @ts-ignore
        game.update(50) // Tiny update

        // Now move it back down to bottom
        game.moveDown()

        // It should start counting from 0 again.
        // If it didn't reset, 300 + 300 > 500 would lock.
        // @ts-ignore
        game.update(300)

        // Total time at bottom: 300 (first) + 300 (second). 
        // If reset worked, current timer is 300.
        expect(game.currentPiece).toBe(oldPiece)

        // Add remaining 250ms -> 550ms
        // @ts-ignore
        game.update(250)
        expect(game.currentPiece).not.toBe(oldPiece)
    })
})
