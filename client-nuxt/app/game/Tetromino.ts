/**
 * Tetromino - Represents a Tetris piece
 * 
 * Each tetromino has:
 * - type: I, O, T, S, Z, J, L
 * - position: x, y on the board
 * - rotationIndex: 0-3 (current rotation state)
 */
import { SHAPES, COLORS } from './shapes'

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export interface Block {
    x: number
    y: number
}

export class Tetromino {
    readonly type: TetrominoType
    x: number
    y: number
    rotationIndex: number
    readonly color: string

    constructor(
        type: TetrominoType,
        x: number = 3, // center of 10-wide board: (10-4)/2 = 3
        y: number = 0
    ) {
        this.type = type
        this.x = x
        this.y = y
        this.rotationIndex = 0
        this.color = COLORS[type] ?? '#ffffff'
    }

    /**
     * Get the shape data for current rotation
     */
    private getShape(): [number, number][] {
        const shapes = SHAPES[this.type]
        if (!shapes) {
            throw new Error(`Unknown tetromino type: ${this.type}`)
        }
        return shapes[this.rotationIndex] ?? shapes[0]!
    }

    /**
     * Get absolute block positions on the board
     */
    getBlocks(): Block[] {
        const shape = this.getShape()
        return shape.map(([row, col]) => ({
            x: this.x + col,
            y: this.y + row,
        }))
    }

    /**
     * Rotate clockwise (90 degrees)
     */
    rotate(): void {
        this.rotationIndex = (this.rotationIndex + 1) % 4
    }

    /**
     * Rotate counter-clockwise (270 degrees)
     */
    rotateCounterClockwise(): void {
        this.rotationIndex = (this.rotationIndex + 3) % 4
    }

    /**
     * Move piece by delta
     */
    move(dx: number, dy: number): void {
        this.x += dx
        this.y += dy
    }

    /**
     * Create a clone of this tetromino
     */
    clone(): Tetromino {
        const cloned = new Tetromino(this.type, this.x, this.y)
        cloned.rotationIndex = this.rotationIndex
        return cloned
    }
}
