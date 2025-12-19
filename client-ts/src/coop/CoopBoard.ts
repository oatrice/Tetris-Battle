/**
 * CoopBoard.ts
 * Horizontal Coop Board for 2-Player Cooperative Mode
 * 
 * Dimensions: 24 columns x 12 rows
 * Layout:
 * ┌────────────────────────┐
 * │  P1 Zone  │  P2 Zone   │
 * │  (0-11)   │  (12-23)   │
 * └────────────────────────┘
 */

interface PieceShape {
    shape: number[][];
    type?: string;
}

interface PlayerZone {
    startX: number;
    endX: number;
}

interface Position {
    x: number;
    y: number;
}

export class CoopBoard {
    readonly width: number = 24;
    readonly height: number = 12;
    grid: number[][];

    constructor() {
        this.grid = Array.from(
            { length: this.height },
            () => Array(this.width).fill(0)
        );
    }

    /**
     * Get the zone boundaries for a player
     * @param player - Player number (1 or 2)
     * @returns Zone boundaries { startX, endX }
     */
    getPlayerZone(player: 1 | 2): PlayerZone {
        if (player === 1) {
            return { startX: 0, endX: 11 };
        }
        return { startX: 12, endX: 23 };
    }

    /**
     * Get spawn position for a player's piece
     * Centered in their zone, at top of board
     * @param player - Player number (1 or 2)
     * @returns Spawn position { x, y }
     */
    getSpawnPosition(player: 1 | 2): Position {
        const zone = this.getPlayerZone(player);
        // Center a 4-wide piece in the zone
        // Zone width = 12, piece width = 4, so offset = (12 - 4) / 2 = 4
        const centerX = zone.startX + 4;
        return { x: centerX, y: 0 };
    }

    /**
     * Check if a piece position is valid (no collision, within bounds)
     * @param piece - The piece to check
     * @param x - X position
     * @param y - Y position
     * @returns true if valid
     */
    isValidPosition(piece: PieceShape, x: number, y: number): boolean {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const newX = x + c;
                    const newY = y + r;

                    // Check bounds
                    if (
                        newX < 0 ||
                        newX >= this.width ||
                        newY < 0 ||
                        newY >= this.height
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

    /**
     * Lock a piece onto the board at given position
     * @param piece - The piece to lock
     * @param x - X position
     * @param y - Y position
     */
    lockPiece(piece: PieceShape, x: number, y: number): void {
        for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
                if (piece.shape[r][c] !== 0) {
                    const newX = x + c;
                    const newY = y + r;
                    if (
                        newY >= 0 &&
                        newY < this.height &&
                        newX >= 0 &&
                        newX < this.width
                    ) {
                        this.grid[newY][newX] = 1;
                    }
                }
            }
        }
    }

    /**
     * Clear completed lines and return info
     * @returns { count, indices } of cleared lines
     */
    clearLines(): { count: number; indices: number[] } {
        const indices: number[] = [];

        // Identify full rows
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y].every(cell => cell !== 0)) {
                indices.push(y);
            }
        }

        if (indices.length > 0) {
            // Remove full rows
            const newGrid = this.grid.filter((_, index) => !indices.includes(index));
            const linesCleared = indices.length;

            // Add new empty rows at top
            const emptyRows = Array.from(
                { length: linesCleared },
                () => Array(this.width).fill(0)
            );
            this.grid = [...emptyRows, ...newGrid];

            return { count: linesCleared, indices };
        }

        return { count: 0, indices: [] };
    }
}
