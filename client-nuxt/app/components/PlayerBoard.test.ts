/**
 * PlayerBoard.vue Unit Tests
 * TDD: RED -> GREEN -> REFACTOR
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('PlayerBoard Constants', () => {
    // Read the source file to extract CELL_SIZE
    const sourcePath = resolve(__dirname, './PlayerBoard.vue')
    const sourceCode = readFileSync(sourcePath, 'utf-8')

    // Extract CELL_SIZE from source code using regex
    const cellSizeMatch = sourceCode.match(/const CELL_SIZE = (\d+)/)
    const actualCellSize = cellSizeMatch?.[1] ? parseInt(cellSizeMatch[1], 10) : 0

    const EXPECTED_CELL_SIZE = 24  // Target: Increased from 20 -> 24
    const BOARD_WIDTH = 10
    const BOARD_HEIGHT = 20

    it('should have CELL_SIZE = 24 (matching SoloGame)', () => {
        // 🔴 RED: This will FAIL until we change PlayerBoard.vue
        expect(actualCellSize).toBe(EXPECTED_CELL_SIZE)
    })

    it('should result in canvas width = 240px and height = 480px', () => {
        const canvasWidth = actualCellSize * BOARD_WIDTH
        const canvasHeight = actualCellSize * BOARD_HEIGHT

        // 🔴 RED: These will FAIL until we change PlayerBoard.vue
        expect(canvasWidth).toBe(240)   // 10 * 24
        expect(canvasHeight).toBe(480)  // 20 * 24
    })
})
