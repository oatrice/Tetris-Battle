/**
 * 🔴 RED Phase: DuoGame Test
 * Failing tests for DuoGame class - manages 2 players in local multiplayer
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { DuoGame } from './DuoGame'

describe('DuoGame', () => {
    let duoGame: DuoGame

    beforeEach(() => {
        duoGame = new DuoGame()
    })

    describe('constructor', () => {
        it('should create two game instances', () => {
            expect(duoGame.player1).toBeDefined()
            expect(duoGame.player2).toBeDefined()
        })

        it('should have both games not over initially', () => {
            expect(duoGame.player1.isGameOver).toBe(false)
            expect(duoGame.player2.isGameOver).toBe(false)
        })

        it('should start with no winner', () => {
            expect(duoGame.winner).toBeNull()
        })

        it('should start as not paused', () => {
            expect(duoGame.isPaused).toBe(false)
        })
    })

    describe('player controls', () => {
        it('should move player 1 left when p1MoveLeft is called', () => {
            const initialX = duoGame.player1.currentPiece.x

            duoGame.p1MoveLeft()

            expect(duoGame.player1.currentPiece.x).toBe(initialX - 1)
        })

        it('should move player 2 left when p2MoveLeft is called', () => {
            const initialX = duoGame.player2.currentPiece.x

            duoGame.p2MoveLeft()

            expect(duoGame.player2.currentPiece.x).toBe(initialX - 1)
        })

        it('should move player 1 right', () => {
            const initialX = duoGame.player1.currentPiece.x

            duoGame.p1MoveRight()

            expect(duoGame.player1.currentPiece.x).toBe(initialX + 1)
        })

        it('should move player 2 right', () => {
            const initialX = duoGame.player2.currentPiece.x

            duoGame.p2MoveRight()

            expect(duoGame.player2.currentPiece.x).toBe(initialX + 1)
        })

        it('should rotate player 1', () => {
            duoGame.p1Rotate()

            expect(duoGame.player1.currentPiece.rotationIndex).toBe(1)
        })

        it('should rotate player 2', () => {
            duoGame.p2Rotate()

            expect(duoGame.player2.currentPiece.rotationIndex).toBe(1)
        })

        it('should hard drop player 1', () => {
            const initialScore = duoGame.player1.score

            duoGame.p1HardDrop()

            expect(duoGame.player1.score).toBeGreaterThan(initialScore)
        })

        it('should hard drop player 2', () => {
            const initialScore = duoGame.player2.score

            duoGame.p2HardDrop()

            expect(duoGame.player2.score).toBeGreaterThan(initialScore)
        })

        it('should hold for player 1', () => {
            duoGame.p1Hold()

            expect(duoGame.player1.heldPiece).toBeDefined()
        })

        it('should hold for player 2', () => {
            duoGame.p2Hold()

            expect(duoGame.player2.heldPiece).toBeDefined()
        })
    })

    describe('game loop', () => {
        it('should update both games on tick', () => {
            const initialY1 = duoGame.player1.currentPiece.y
            const initialY2 = duoGame.player2.currentPiece.y

            duoGame.tick()

            expect(duoGame.player1.currentPiece.y).toBe(initialY1 + 1)
            expect(duoGame.player2.currentPiece.y).toBe(initialY2 + 1)
        })

        it('should not tick when paused', () => {
            duoGame.togglePause()
            const initialY1 = duoGame.player1.currentPiece.y

            duoGame.tick()

            expect(duoGame.player1.currentPiece.y).toBe(initialY1)
        })
    })

    describe('win condition', () => {
        it('should set winner to 2 when player 1 game over', () => {
            // Force player 1 game over
            duoGame.player1.isGameOver = true

            duoGame.checkWinCondition()

            expect(duoGame.winner).toBe(2)
        })

        it('should set winner to 1 when player 2 game over', () => {
            // Force player 2 game over
            duoGame.player2.isGameOver = true

            duoGame.checkWinCondition()

            expect(duoGame.winner).toBe(1)
        })

        it('should not set winner while both playing', () => {
            duoGame.checkWinCondition()

            expect(duoGame.winner).toBeNull()
        })
    })

    describe('attack system', () => {
        it('should send garbage to player 2 when player 1 clears 2+ lines', () => {
            // Fill bottom 2 rows for player 1
            for (let y = duoGame.player1.board.height - 2; y < duoGame.player1.board.height; y++) {
                for (let x = 0; x < duoGame.player1.board.width; x++) {
                    duoGame.player1.board.setCell(x, y, 1)
                }
            }
            // Clear one cell for I piece to fill
            duoGame.player1.board.setCell(0, duoGame.player1.board.height - 1, 0)
            duoGame.player1.board.setCell(0, duoGame.player1.board.height - 2, 0)

            // Count garbage lines in player 2 board before
            const garbageBeforeP2 = countGarbageLines(duoGame.player2.board)

            // Simulate attack (2 lines = 1 garbage)
            duoGame.sendGarbage(1, 2, 1) // From player 1, 2 lines cleared, 1 garbage sent

            const garbageAfterP2 = countGarbageLines(duoGame.player2.board)
            expect(garbageAfterP2).toBeGreaterThan(garbageBeforeP2)
        })

        it('should send garbage to player 1 when player 2 clears 2+ lines', () => {
            const garbageBefore = countGarbageLines(duoGame.player1.board)

            duoGame.sendGarbage(2, 2, 1) // From player 2, 2 lines cleared, 1 garbage sent

            const garbageAfter = countGarbageLines(duoGame.player1.board)
            expect(garbageAfter).toBeGreaterThan(garbageBefore)
        })
    })
})

// Helper to count non-empty rows at bottom (garbage indicator)
function countGarbageLines(board: { height: number; width: number; getCell: (x: number, y: number) => number }): number {
    let count = 0
    for (let y = board.height - 1; y >= 0; y--) {
        let hasBlock = false
        for (let x = 0; x < board.width; x++) {
            if (board.getCell(x, y) > 0) {
                hasBlock = true
                break
            }
        }
        if (hasBlock) count++
        else break
    }
    return count
}
