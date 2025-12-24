/**
 * CascadeGravity - Logic for cascade/puyo-style gravity
 * 
 * After line clears:
 * 1. Detect floating blocks (not connected to bottom)
 * 2. Drop floating blocks by 1 cell
 * 3. Check for new line clears
 * 4. Repeat until stable
 */
import type { Board } from './Board'
import { calculateScore } from './LineClearing'

export interface Block {
    x: number
    y: number
    value: number
}

export interface CascadeResult {
    linesCleared: number
    chainCount: number
    score: number
}

/**
 * Find all blocks that are floating (not connected to the bottom row)
 * Uses flood-fill from bottom row to mark grounded blocks
 */
export function findFloatingBlocks(board: Board): Block[] {
    const width = board.width
    const height = board.height

    // Track which cells are grounded (connected to bottom)
    const grounded: boolean[][] = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => false)
    )

    // BFS from bottom row to find all grounded blocks
    const queue: Array<{ x: number; y: number }> = []

    // Start with all non-empty cells in bottom row
    for (let x = 0; x < width; x++) {
        if (!board.isCellEmpty(x, height - 1)) {
            grounded[height - 1]![x] = true
            queue.push({ x, y: height - 1 })
        }
    }

    // BFS to find connected blocks (4-directional)
    const directions = [
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 }
    ]

    while (queue.length > 0) {
        const { x, y } = queue.shift()!

        for (const { dx, dy } of directions) {
            const nx = x + dx
            const ny = y + dy

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (!grounded[ny]![nx] && !board.isCellEmpty(nx, ny)) {
                    grounded[ny]![nx] = true
                    queue.push({ x: nx, y: ny })
                }
            }
        }
    }

    // Collect all non-grounded blocks
    const floating: Block[] = []

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!board.isCellEmpty(x, y) && !grounded[y]![x]) {
                floating.push({
                    x,
                    y,
                    value: board.getCell(x, y)
                })
            }
        }
    }

    return floating
}

/**
 * Apply gravity - drop all floating blocks by 1 cell (simple column-based)
 * Loops from bottom-up in each column, swaps if cell below is empty
 * @returns true if any blocks moved
 */
export function applyGravity(board: Board): boolean {
    let moved = false

    for (let x = 0; x < board.width; x++) {
        for (let y = board.height - 2; y >= 0; y--) {
            if (!board.isCellEmpty(x, y) && board.isCellEmpty(x, y + 1)) {
                const value = board.getCell(x, y)
                board.setCell(x, y + 1, value)
                board.setCell(x, y, 0)
                moved = true
            }
        }
    }

    return moved
}

/**
 * Check if a line is complete (all cells filled)
 */
function isLineComplete(board: Board, y: number): boolean {
    for (let x = 0; x < board.width; x++) {
        if (board.isCellEmpty(x, y)) {
            return false
        }
    }
    return true
}

/**
 * Find and clear complete lines WITHOUT shifting rows down
 * This leaves "floating" blocks that gravity will handle
 * @returns number of lines cleared
 */
function clearLinesOnly(board: Board): number {
    let linesCleared = 0

    for (let y = board.height - 1; y >= 0; y--) {
        if (isLineComplete(board, y)) {
            // Clear this line (set all cells to 0)
            for (let x = 0; x < board.width; x++) {
                board.setCell(x, y, 0)
            }
            linesCleared++
        }
    }

    return linesCleared
}

/**
 * Perform full cascade cycle:
 * 1. Clear complete lines (without shifting - leaves floating blocks)
 * 2. Apply gravity until stable (blocks fall individually)
 * 3. Repeat if new lines formed (chain reaction)
 */
export function cascadeClear(board: Board, level: number = 1): CascadeResult {
    let totalLinesCleared = 0
    let chainCount = 0
    let totalScore = 0

    // First line clear (no shifting - just remove the line)
    let lines = clearLinesOnly(board)
    console.log('[cascadeClear] Initial lines cleared:', lines)

    while (lines > 0) {
        chainCount++
        totalLinesCleared += lines

        // Calculate score with chain bonus
        const chainMultiplier = chainCount
        totalScore += calculateScore(lines, level) * chainMultiplier

        // Apply gravity until stable (blocks fall one by one)
        let gravitySteps = 0
        while (applyGravity(board)) {
            gravitySteps++
        }
        console.log('[cascadeClear] Chain', chainCount, '- gravity steps:', gravitySteps)

        // Check for new lines (chain reaction)
        lines = clearLinesOnly(board)
    }

    console.log('[cascadeClear] Final result - lines:', totalLinesCleared, 'chains:', chainCount)
    return {
        linesCleared: totalLinesCleared,
        chainCount,
        score: totalScore
    }
}
