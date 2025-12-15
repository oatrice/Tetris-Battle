import { Tetromino } from './Tetromino';

export class Board {
    width: number;
    height: number;
    grid: number[][];

    constructor(width: number = 10, height: number = 20) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () => Array(width).fill(0));
    }

    isValidPosition(piece: Tetromino, x: number, y: number): boolean {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const newX = x + c;
                    const newY = y + r;

                    // Check bounds
                    if (
                        newX < 0 ||
                        newX >= this.width ||
                        newY >= this.height ||
                        newY < 0 // Optional: usually we allow starting above board, but for now strict bound logic
                    ) {
                        return false;
                    }

                    // Check collision with existing blocks
                    if (this.grid[newY][newX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    lockPiece(piece: Tetromino, x: number, y: number): void {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const newY = y + r;
                    const newX = x + c;
                    if (newY >= 0 && newY < this.height && newX >= 0 && newX < this.width) {
                        this.grid[newY][newX] = 1; // Or use piece type/color
                    }
                }
            }
        }
    }

    clearLines(): number {
        let linesCleared = 0;

        // Filter out full rows
        // Check from bottom up is optimization, but filter is cleaner code
        // Check from bottom up is optimization, but filter is cleaner code
        const newGrid = this.grid.filter(row => row.some(cell => cell === 0));
        linesCleared = this.height - newGrid.length;

        // Pad new empty rows at top
        const emptyRows = Array.from({ length: linesCleared }, () => Array(this.width).fill(0));
        this.grid = [...emptyRows, ...newGrid];

        return linesCleared;
    }
}
