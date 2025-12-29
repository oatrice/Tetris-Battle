/**
 * SinglePlayerGame.vue Constants Unit Tests
 * TDD: RED -> GREEN -> REFACTOR
 * 
 * Tests for:
 * 1. Enlarged CELL_SIZE for fullscreen mode
 * 2. Mode label changed from "SOLO" to "NORMAL"
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('SinglePlayerGame Constants & Labels', () => {
    // Read the source file
    const sourcePath = resolve(__dirname, './SinglePlayerGame.vue')
    const sourceCode = readFileSync(sourcePath, 'utf-8')

    // Extract CELL_SIZE from source code
    const cellSizeMatch = sourceCode.match(/const CELL_SIZE = (\d+)/)
    const actualCellSize = cellSizeMatch?.[1] ? parseInt(cellSizeMatch[1], 10) : 0

    const EXPECTED_CELL_SIZE = 26  // Reduced from 32 -> 26 for more side space
    const BOARD_WIDTH = 10
    const BOARD_HEIGHT = 20

    describe('Canvas Size', () => {
        it('should have CELL_SIZE = 26 for balanced view with side space', () => {
            expect(actualCellSize).toBe(EXPECTED_CELL_SIZE)
        })

        it('should result in canvas width = 260px and height = 520px', () => {
            const canvasWidth = actualCellSize * BOARD_WIDTH
            const canvasHeight = actualCellSize * BOARD_HEIGHT

            expect(canvasWidth).toBe(260)   // 10 * 26
            expect(canvasHeight).toBe(520)  // 20 * 26
        })
    })

    describe('Mode Label', () => {
        it('should display "NORMAL" instead of "SOLO"', () => {
            // Check that SOLO is replaced with NORMAL
            const hasNormalLabel = sourceCode.includes("'🎯 NORMAL'")
            const hasSoloLabel = sourceCode.includes("'🎯 SOLO'")

            expect(hasNormalLabel).toBe(true)
            expect(hasSoloLabel).toBe(false)
        })
    })
})
