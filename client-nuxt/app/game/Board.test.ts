/**
 * 🔴 RED Phase: Board Test
 * Failing tests for Board class - data structure for Tetris game grid
 */
import { describe, it, expect } from 'vitest'
import { Board } from './Board'

describe('Board', () => {
    describe('constructor', () => {
        it('should create a board with standard Tetris dimensions (10x20)', () => {
            const board = new Board()

            expect(board.width).toBe(10)
            expect(board.height).toBe(20)
        })

        it('should create a board with custom dimensions', () => {
            const board = new Board(8, 16)

            expect(board.width).toBe(8)
            expect(board.height).toBe(16)
        })
    })

    describe('getCell', () => {
        it('should return 0 (empty) for all cells initially', () => {
            const board = new Board()

            expect(board.getCell(0, 0)).toBe(0)
            expect(board.getCell(5, 10)).toBe(0)
            expect(board.getCell(9, 19)).toBe(0)
        })

        it('should return -1 for out of bounds coordinates', () => {
            const board = new Board()

            expect(board.getCell(-1, 0)).toBe(-1)
            expect(board.getCell(0, -1)).toBe(-1)
            expect(board.getCell(10, 0)).toBe(-1)
            expect(board.getCell(0, 20)).toBe(-1)
        })
    })

    describe('setCell', () => {
        it('should set a cell value at valid coordinates', () => {
            const board = new Board()

            board.setCell(5, 10, 1)

            expect(board.getCell(5, 10)).toBe(1)
        })

        it('should not set cell for out of bounds coordinates', () => {
            const board = new Board()

            const result = board.setCell(-1, 0, 1)

            expect(result).toBe(false)
        })

        it('should return true for successful set', () => {
            const board = new Board()

            const result = board.setCell(5, 10, 1)

            expect(result).toBe(true)
        })
    })

    describe('isValidPosition', () => {
        it('should return true for coordinates within bounds', () => {
            const board = new Board()

            expect(board.isValidPosition(0, 0)).toBe(true)
            expect(board.isValidPosition(5, 10)).toBe(true)
            expect(board.isValidPosition(9, 19)).toBe(true)
        })

        it('should return false for coordinates outside bounds', () => {
            const board = new Board()

            expect(board.isValidPosition(-1, 0)).toBe(false)
            expect(board.isValidPosition(0, -1)).toBe(false)
            expect(board.isValidPosition(10, 0)).toBe(false)
            expect(board.isValidPosition(0, 20)).toBe(false)
        })
    })

    describe('clear', () => {
        it('should reset all cells to 0', () => {
            const board = new Board()
            board.setCell(5, 10, 1)
            board.setCell(3, 5, 2)

            board.clear()

            expect(board.getCell(5, 10)).toBe(0)
            expect(board.getCell(3, 5)).toBe(0)
        })
    })

    describe('isCellEmpty', () => {
        it('should return true for empty cells', () => {
            const board = new Board()

            expect(board.isCellEmpty(0, 0)).toBe(true)
        })

        it('should return false for occupied cells', () => {
            const board = new Board()
            board.setCell(5, 10, 1)

            expect(board.isCellEmpty(5, 10)).toBe(false)
        })

        it('should return false for out of bounds (treat as wall)', () => {
            const board = new Board()

            expect(board.isCellEmpty(-1, 0)).toBe(false)
            expect(board.isCellEmpty(10, 0)).toBe(false)
        })
    })
})
