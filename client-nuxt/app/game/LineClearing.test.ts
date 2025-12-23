/**
 * 🔴 RED Phase: Line Clearing Test
 * Failing tests for line clearing functionality
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from './Board'
import { checkAndClearLines, calculateScore } from './LineClearing'

describe('LineClearing', () => {
    let board: Board

    beforeEach(() => {
        board = new Board()
    })

    describe('checkAndClearLines', () => {
        it('should return 0 when no lines are complete', () => {
            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(0)
        })

        it('should detect and clear one complete line', () => {
            // Fill bottom row completely
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, board.height - 1, 1)
            }

            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(1)
            // Bottom row should be cleared
            for (let x = 0; x < board.width; x++) {
                expect(board.getCell(x, board.height - 1)).toBe(0)
            }
        })

        it('should detect and clear multiple complete lines', () => {
            // Fill bottom two rows completely
            for (let y = board.height - 2; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    board.setCell(x, y, 1)
                }
            }

            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(2)
        })

        it('should detect and clear four lines (Tetris)', () => {
            // Fill bottom four rows completely
            for (let y = board.height - 4; y < board.height; y++) {
                for (let x = 0; x < board.width; x++) {
                    board.setCell(x, y, 1)
                }
            }

            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(4)
        })

        it('should shift rows down after clearing', () => {
            // Place a block at row 18
            board.setCell(5, board.height - 2, 2)
            // Fill row 19 completely
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, board.height - 1, 1)
            }

            checkAndClearLines(board)

            // The block at row 18 should have moved down to row 19
            expect(board.getCell(5, board.height - 1)).toBe(2)
            expect(board.getCell(5, board.height - 2)).toBe(0)
        })

        it('should not clear incomplete lines', () => {
            // Fill bottom row except for one cell
            for (let x = 0; x < board.width - 1; x++) {
                board.setCell(x, board.height - 1, 1)
            }

            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(0)
            // Row should still have blocks
            expect(board.getCell(0, board.height - 1)).toBe(1)
        })

        it('should only clear complete lines, not adjacent incomplete ones', () => {
            // Row 19: complete
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, board.height - 1, 1)
            }
            // Row 18: incomplete (missing one cell)
            for (let x = 0; x < board.width - 1; x++) {
                board.setCell(x, board.height - 2, 2)
            }

            const linesCleared = checkAndClearLines(board)

            expect(linesCleared).toBe(1)
            // Row 18's blocks should now be at row 19
            expect(board.getCell(0, board.height - 1)).toBe(2)
        })
    })

    describe('calculateScore', () => {
        it('should return 100 for single line', () => {
            expect(calculateScore(1, 1)).toBe(100)
        })

        it('should return 300 for double', () => {
            expect(calculateScore(2, 1)).toBe(300)
        })

        it('should return 500 for triple', () => {
            expect(calculateScore(3, 1)).toBe(500)
        })

        it('should return 800 for tetris (4 lines)', () => {
            expect(calculateScore(4, 1)).toBe(800)
        })

        it('should multiply by level', () => {
            expect(calculateScore(1, 2)).toBe(200) // 100 * 2
            expect(calculateScore(4, 5)).toBe(4000) // 800 * 5
        })

        it('should return 0 for 0 lines', () => {
            expect(calculateScore(0, 1)).toBe(0)
        })
    })
})
