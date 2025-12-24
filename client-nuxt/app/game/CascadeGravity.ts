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
import { checkAndClearLines, calculateScore } from './LineClearing'

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
 * Apply gravity - drop all floating blocks by 1 cell
 * @returns true if any blocks moved
 */
export function applyGravity(board: Board): boolean {
    const floating = findFloatingBlocks(board)

    if (floating.length === 0) {
        return false
    }

    // Sort by y descending (process bottom blocks first to avoid collisions)
    floating.sort((a, b) => b.y - a.y)

    let moved = false

    for (const block of floating) {
        const newY = block.y + 1

        // Check if can drop (not at bottom and cell below is empty)
        if (newY < board.height && board.isCellEmpty(block.x, newY)) {
            // Clear old position
            board.setCell(block.x, block.y, 0)
            // Set new position
            board.setCell(block.x, newY, block.value)
            moved = true
        }
    }

    return moved
}

/**
 * Perform full cascade cycle:
 * 1. Clear complete lines
 * 2. Apply gravity until stable
 * 3. Repeat if new lines formed (chain reaction)
 */
export function cascadeClear(board: Board, level: number = 1): CascadeResult {
    let totalLinesCleared = 0
    let chainCount = 0
    let totalScore = 0

    // First line clear
    let lines = checkAndClearLines(board)

    while (lines > 0) {
        chainCount++
        totalLinesCleared += lines

        // Calculate score with chain bonus
        // Each chain multiplies the base score
        const chainMultiplier = chainCount
        totalScore += calculateScore(lines, level) * chainMultiplier

        // Apply gravity until stable
        while (applyGravity(board)) {
            // Keep dropping until no more movement
        }

        // Check for new lines (chain reaction)
        lines = checkAndClearLines(board)
    }

    return {
        linesCleared: totalLinesCleared,
        chainCount,
        score: totalScore
    }
}
