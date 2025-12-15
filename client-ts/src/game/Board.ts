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

    clearLines(): { count: number, indices: number[] } {
        const indices: number[] = [];

        // Identify full rows
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                indices.push(y);
            }
        }

        if (indices.length > 0) {
            // Remove full rows - create new grid without them
            const newGrid = this.grid.filter((_, index) => !indices.includes(index));
            const linesCleared = indices.length;

            // Pad new empty rows at top
            const emptyRows = Array.from({ length: linesCleared }, () => Array(this.width).fill(0));
            this.grid = [...emptyRows, ...newGrid];

            return { count: linesCleared, indices };
        }

        return { count: 0, indices: [] };
    }
}
