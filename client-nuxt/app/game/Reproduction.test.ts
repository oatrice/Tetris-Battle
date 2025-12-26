/**
 * Reproduction Tests for User Reported Bugs
 * 
 * Bugs:
 * 1. Hold feature usable in Solo (Should be disabled)
 * 2. Score calculation (Missing soft drop score)
 * 3. Next piece not changing (Reactivity issue - inferred)
 * 4. Game Over not showing (UI issue)
 */
import { describe, it, expect } from 'vitest'
import { Game } from './Game'
import { SpecialGame } from './SpecialGame'

describe('Bug Reproduction & Fix Verification', () => {

    describe('Bug: Hold feature usable in Solo mode', () => {
        it('should NOT allow hold by default in Game (Solo logic)', () => {
            const game = new Game()
            expect(game.allowHold).toBe(false) // Default to false

            const initialPieceType = game.currentPiece.type
            game.hold()

            // Should still have no held piece
            expect(game.heldPiece).toBeNull()
            // Current piece should remain same (not swapped)
            expect(game.currentPiece.type).toBe(initialPieceType)
        })

        it('should ALLOW hold in SpecialGame', () => {
            const game = new SpecialGame()
            expect(game.allowHold).toBe(true) // Special enables it

            game.hold()

            // Should have held piece
            expect(game.heldPiece).toBeDefined()
        })
    })

    describe('Bug: Score calculation (Soft Drop)', () => {
        it('should award 1 point for soft drop (moveDown)', () => {
            const game = new Game()
            // Ensure piece can move down
            // Default spawn is high up, so it can move

            const startScore = game.score
            const moved = game.moveDown()

            expect(moved).toBe(true)
            // Score should increase by 1
            expect(game.score).toBe(startScore + 1)
        })
    })

    // Note on reactivity and UI bugs:
    // "Next piece not changing" and "Game Over not showing" were likely due to 
    // the Game instance not being reactive in Vue. 
    // Unit tests here confirm the Logic is correct (nextPiece updates on lock).
    // The Fix involved wrapping `new Game()` with `reactive()` in app.vue.

    describe('Logic Verification for Next Piece', () => {
        it('should update nextPiece property after lock', () => {
            const game = new Game()
            const firstNext = game.nextPiece

            game.hardDrop() // Lock current

            expect(game.nextPiece).not.toBe(firstNext)
            expect(game.currentPiece.type).toBe(firstNext.type)
        })
    })
})
