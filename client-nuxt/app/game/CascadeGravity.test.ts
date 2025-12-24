/**
 * 🔴 RED Phase: CascadeGravity Tests
 * Tests for cascade gravity (Puyo Puyo style block dropping)
 * 
 * Cascade Gravity:
 * - After line clears, floating blocks drop individually
 * - Chain reactions: if dropping creates new lines, they clear too
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { Board } from './Board'
import {
    findFloatingBlocks,
    applyGravity,
    cascadeClear,
    type Block,
    type CascadeResult
} from './CascadeGravity'

describe('CascadeGravity', () => {
    let board: Board

    beforeEach(() => {
        board = new Board(10, 20)
    })

    describe('findFloatingBlocks', () => {
        it('should return empty array when no blocks exist', () => {
            const floating = findFloatingBlocks(board)
            expect(floating).toEqual([])
        })

        it('should return empty array when all blocks are grounded', () => {
            // Block at bottom row - grounded
            board.setCell(5, 19, 1)

            const floating = findFloatingBlocks(board)
            expect(floating).toEqual([])
        })

        it('should detect floating block (not connected to bottom)', () => {
            // Block floating in the air (row 10)
            board.setCell(5, 10, 1)

            const floating = findFloatingBlocks(board)
            expect(floating).toHaveLength(1)
            expect(floating).toContainEqual({ x: 5, y: 10, value: 1 })
        })

        it('should not mark blocks as floating if connected to grounded blocks', () => {
            // Vertical tower: row 19 (grounded) + row 18 (connected)
            board.setCell(5, 19, 1)
            board.setCell(5, 18, 2)

            const floating = findFloatingBlocks(board)
            expect(floating).toEqual([])
        })

        it('should detect multiple floating blocks', () => {
            // Two separate floating blocks
            board.setCell(2, 5, 1)
            board.setCell(7, 3, 2)

            const floating = findFloatingBlocks(board)
            expect(floating).toHaveLength(2)
        })

        it('should detect floating group (connected but not grounded)', () => {
            // Horizontal group floating at row 10
            board.setCell(4, 10, 1)
            board.setCell(5, 10, 1)
            board.setCell(6, 10, 1)

            const floating = findFloatingBlocks(board)
            expect(floating).toHaveLength(3)
        })
    })

    describe('applyGravity', () => {
        it('should return false when no floating blocks', () => {
            board.setCell(5, 19, 1) // Grounded

            const moved = applyGravity(board)
            expect(moved).toBe(false)
        })

        it('should drop floating block by 1 cell', () => {
            board.setCell(5, 10, 1) // Floating at row 10

            const moved = applyGravity(board)

            expect(moved).toBe(true)
            expect(board.getCell(5, 10)).toBe(0) // Old position empty
            expect(board.getCell(5, 11)).toBe(1) // New position has block
        })

        it('should drop multiple floating blocks simultaneously', () => {
            board.setCell(2, 5, 1)
            board.setCell(7, 8, 2)

            applyGravity(board)

            expect(board.getCell(2, 6)).toBe(1)
            expect(board.getCell(7, 9)).toBe(2)
        })

        it('should stop dropping when block lands on another block', () => {
            board.setCell(5, 19, 1) // Grounded block
            board.setCell(5, 17, 2) // Floating block 2 rows above

            applyGravity(board)

            expect(board.getCell(5, 18)).toBe(2) // Dropped by 1
            expect(board.getCell(5, 19)).toBe(1) // Original still there
        })

        it('should preserve block color/value when dropping', () => {
            board.setCell(3, 5, 3) // Color 3
            board.setCell(6, 5, 7) // Color 7

            applyGravity(board)

            expect(board.getCell(3, 6)).toBe(3)
            expect(board.getCell(6, 6)).toBe(7)
        })
    })

    describe('cascadeClear', () => {
        it('should return zero stats when no lines to clear', () => {
            board.setCell(5, 19, 1) // Single block

            const result = cascadeClear(board)

            expect(result.linesCleared).toBe(0)
            expect(result.chainCount).toBe(0)
        })

        it('should clear a complete line and apply gravity', () => {
            // Fill row 19 except one cell, with a block above
            for (let x = 0; x < 10; x++) {
                board.setCell(x, 19, 1)
            }
            board.setCell(5, 18, 2) // Block above

            const result = cascadeClear(board)

            expect(result.linesCleared).toBe(1)
            // After clear, block at 18 should drop to 19
            expect(board.getCell(5, 19)).toBe(2)
        })

        it('should detect chain reaction (2-chain)', () => {
            // Setup: clearing row 19 will drop blocks that complete row 18

            // Row 19: complete line
            for (let x = 0; x < 10; x++) {
                board.setCell(x, 19, 1)
            }

            // Row 18: missing cell at x=5
            for (let x = 0; x < 10; x++) {
                if (x !== 5) board.setCell(x, 18, 2)
            }

            // Row 17: block at x=5 that will drop to complete row 18
            board.setCell(5, 17, 3)

            const result = cascadeClear(board)

            expect(result.linesCleared).toBe(2)
            expect(result.chainCount).toBe(2) // 2-chain!
        })

        it('should calculate correct score with chain bonus', () => {
            // Setup 2-chain scenario
            for (let x = 0; x < 10; x++) {
                board.setCell(x, 19, 1)
            }
            for (let x = 0; x < 10; x++) {
                if (x !== 5) board.setCell(x, 18, 2)
            }
            board.setCell(5, 17, 3)

            const result = cascadeClear(board)

            // Chain bonus: each subsequent chain should multiply score
            expect(result.score).toBeGreaterThan(200) // More than just 2 singles
        })
    })
})
