/**
 * Board - Data structure for Tetris game grid
 * 
 * Standard Tetris board: 10 columns x 20 rows
 * Cell values:
 *   0 = empty
 *   1-7 = occupied by different piece types (colors)
 *   -1 = out of bounds
 */
export class Board {
    readonly width: number
    readonly height: number
    public grid: number[][]

    constructor(width: number = 10, height: number = 20) {
        this.width = width
        this.height = height
        this.grid = this.createEmptyGrid()
    }

    /**
     * Get cell value at coordinates
     * Returns -1 if out of bounds
     */
    getCell(x: number, y: number): number {
        if (!this.isValidPosition(x, y)) {
            return -1
        }
        return this.grid[y]![x]!
    }

    /**
     * Set cell value at coordinates
     * Returns false if out of bounds
     */
    setCell(x: number, y: number, value: number): boolean {
        if (!this.isValidPosition(x, y)) {
            return false
        }
        this.grid[y]![x] = value
        return true
    }

    /**
     * Check if coordinates are within board bounds
     */
    isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height
    }

    /**
     * Check if a cell is empty (0) and within bounds
     * Returns false for occupied cells or out of bounds
     */
    isCellEmpty(x: number, y: number): boolean {
        if (!this.isValidPosition(x, y)) {
            return false
        }
        return this.grid[y]![x] === 0
    }

    /**
     * Reset all cells to empty (0)
     */
    clear(): void {
        this.grid = this.createEmptyGrid()
    }

    /**
     * Create empty grid filled with zeros
     */
    private createEmptyGrid(): number[][] {
        return Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => 0)
        )
    }
}
