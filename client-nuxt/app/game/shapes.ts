/**
 * Tetromino Shapes Definition
 * 
 * Each shape has 4 rotation states (0, 1, 2, 3)
 * Each rotation state is a 2D array of relative block positions
 * Block positions are [row, col] relative to piece origin
 */

export type TetrominoShapeData = [number, number][][]

/**
 * Standard Tetromino shapes with all 4 rotations
 * Based on SRS (Super Rotation System) standard
 */
export const SHAPES: Record<string, TetrominoShapeData> = {
    // I piece - horizontal bar
    I: [
        [[0, 0], [0, 1], [0, 2], [0, 3]], // rotation 0 - horizontal
        [[0, 2], [1, 2], [2, 2], [3, 2]], // rotation 1 - vertical
        [[2, 0], [2, 1], [2, 2], [2, 3]], // rotation 2 - horizontal
        [[0, 1], [1, 1], [2, 1], [3, 1]], // rotation 3 - vertical
    ],

    // O piece - square (doesn't change with rotation)
    O: [
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],

    // T piece
    T: [
        [[0, 1], [1, 0], [1, 1], [1, 2]], // rotation 0 - T pointing up
        [[0, 1], [1, 1], [1, 2], [2, 1]], // rotation 1 - T pointing right
        [[1, 0], [1, 1], [1, 2], [2, 1]], // rotation 2 - T pointing down
        [[0, 1], [1, 0], [1, 1], [2, 1]], // rotation 3 - T pointing left
    ],

    // S piece
    S: [
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 1], [1, 1], [1, 2], [2, 2]],
        [[1, 1], [1, 2], [2, 0], [2, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],

    // Z piece
    Z: [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 2], [1, 1], [1, 2], [2, 1]],
        [[1, 0], [1, 1], [2, 1], [2, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],

    // J piece
    J: [
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [0, 2], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [2, 2]],
        [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],

    // L piece
    L: [
        [[0, 2], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 1], [2, 2]],
        [[1, 0], [1, 1], [1, 2], [2, 0]],
        [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
}

/**
 * Color mapping for each tetromino type
 */
export const COLORS: Record<string, string> = {
    I: '#00f0f0', // Cyan
    O: '#f0f000', // Yellow
    T: '#a000f0', // Purple
    S: '#00f000', // Green
    Z: '#f00000', // Red
    J: '#0000f0', // Blue
    L: '#f0a000', // Orange
}
