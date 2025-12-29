import { describe, it, expect, beforeEach } from 'vitest'
import { SpecialGame, EffectType } from './SpecialGame'

describe('SpecialGame Serialization', () => {
    let game: SpecialGame

    beforeEach(() => {
        game = new SpecialGame()
    })

    it('should serialize and deserialize special game state correctly', () => {
        // 1. Modify initial state
        game.score = 5000
        game.level = 8
        game.chainCount = 3
        game.isCascading = true
        game.setEffectType(EffectType.WAVE)

        // Move current piece
        game.currentPiece.move(2, 2)
        game.currentPiece.rotate()

        // Hold a piece
        game.allowHold = true
        game.hold()

        // Pause
        game.isPaused = true

        // 2. Serialize
        const state = game.serialize()

        expect(state).toBeDefined()
        expect(state.score).toBe(5000)
        expect(state.level).toBe(8)
        expect(state.chainCount).toBe(3)
        expect(state.isCascading).toBe(true)
        expect(state.effectType).toBe(EffectType.WAVE)
        expect(state.isPaused).toBe(true)

        // 3. Deserialize
        const newGame = SpecialGame.deserialize(state)

        // 4. Verification
        expect(newGame).toBeInstanceOf(SpecialGame)
        expect(newGame.score).toBe(game.score)
        expect(newGame.chainCount).toBe(game.chainCount)
        expect(newGame.isCascading).toBe(game.isCascading)
        expect(newGame.effectType).toBe(game.effectType)
        expect(newGame.isPaused).toBe(true)

        expect(newGame.currentPiece.type).toBe(game.currentPiece.type)
        expect(newGame.currentPiece.x).toBe(game.currentPiece.x)
        expect(newGame.currentPiece.y).toBe(game.currentPiece.y)
        expect(newGame.currentPiece.rotationIndex).toBe(game.currentPiece.rotationIndex)

        expect(newGame.heldPiece?.type).toBe(game.heldPiece?.type)

        // Verify method availability
        expect(typeof newGame.setEffectType).toBe('function')
        expect(typeof newGame.particles).toBe('object')
    })
})
