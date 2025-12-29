import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from './Game'
import { Tetromino } from './Tetromino'

describe('Game Serialization', () => {
    let game: Game

    beforeEach(() => {
        game = new Game()
    })

    it('should serialize and deserialize game state correctly', () => {
        // 1. Modify initial state
        game.score = 1000
        game.level = 5
        game.linesCleared = 45

        // Move current piece
        game.currentPiece.move(1, 1)
        game.currentPiece.rotate()

        // Hold a piece
        game.allowHold = true
        game.hold()

        // Pause
        game.isPaused = true

        // 2. Serialize
        // @ts-ignore - method doesn't exist yet
        const state = game.serialize()

        expect(state).toBeDefined()
        expect(state.score).toBe(1000)
        expect(state.level).toBe(5)
        expect(state.isPaused).toBe(true)
        expect(state.currentPiece.x).toBe(game.currentPiece.x)
        expect(state.currentPiece.y).toBe(game.currentPiece.y)
        expect(state.heldPiece).not.toBeNull()

        // 3. Deserialize into new game
        // @ts-ignore - method doesn't exist yet
        const newGame = Game.deserialize(state)

        // 4. Verification
        expect(newGame.score).toBe(game.score)
        expect(newGame.level).toBe(game.level)
        expect(newGame.linesCleared).toBe(game.linesCleared)
        expect(newGame.isPaused).toBe(true) // Should remain paused

        expect(newGame.currentPiece.type).toBe(game.currentPiece.type)
        expect(newGame.currentPiece.x).toBe(game.currentPiece.x)
        expect(newGame.currentPiece.y).toBe(game.currentPiece.y)
        expect(newGame.currentPiece.rotationIndex).toBe(game.currentPiece.rotationIndex)

        expect(newGame.heldPiece?.type).toBe(game.heldPiece?.type)

        // Check board state (should be empty except where pieces locked, but we didn't lock any)
        // Let's modify grid manually to test board serialization
        game.board.setCell(0, 19, 1) // Set bottom-left to occupied
        // @ts-ignore
        const stateWithBoard = game.serialize()
        // @ts-ignore
        const gameWithBoard = Game.deserialize(stateWithBoard)

        expect(gameWithBoard.board.getCell(0, 19)).toBe(1)
        expect(gameWithBoard.board.getCell(1, 19)).toBe(0)

        // Check internal queues
        // @ts-ignore
        expect(gameWithBoard.pieceQueue.length).toBe(game.pieceQueue.length)
        expect(gameWithBoard.nextPiece.type).toBe(game.nextPiece.type)
    })
})
