/**
 * Game - Main game state manager for Tetris
 * 
 * Manages:
 * - Board state
 * - Current piece movement and collision
 * - Piece spawning and locking
 * - Score tracking
 * - Game over detection
 */
import { Board } from './Board'
import { Tetromino, type TetrominoType } from './Tetromino'
import { checkAndClearLines, calculateScore } from './LineClearing'

const PIECE_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Score values
const SCORE_SOFT_DROP = 1
const SCORE_HARD_DROP_PER_CELL = 2

export class Game {
    readonly board: Board
    currentPiece: Tetromino
    score: number
    level: number
    linesCleared: number
    isGameOver: boolean
    isPaused: boolean
    private pieceQueue: TetrominoType[]

    constructor() {
        this.board = new Board()
        this.score = 0
        this.level = 1
        this.linesCleared = 0
        this.isGameOver = false
        this.isPaused = false
        this.pieceQueue = this.generatePieceQueue()
        this.currentPiece = this.spawnPiece()
    }

    /**
     * Generate a shuffled queue of all 7 piece types (7-bag randomizer)
     */
    private generatePieceQueue(): TetrominoType[] {
        const bag = [...PIECE_TYPES]
        // Fisher-Yates shuffle
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
        }
        return bag
    }

    /**
     * Spawn a new piece at the top of the board
     */
    private spawnPiece(): Tetromino {
        if (this.pieceQueue.length === 0) {
            this.pieceQueue = this.generatePieceQueue()
        }
        const type = this.pieceQueue.pop()!
        const piece = new Tetromino(type)

        // Check if spawn position is valid (game over check)
        if (!this.canPlacePiece(piece)) {
            this.isGameOver = true
        }

        return piece
    }

    /**
     * Check if a piece can be placed at its current position
     */
    canPlacePiece(piece: Tetromino): boolean {
        const blocks = piece.getBlocks()
        return blocks.every(block => {
            // Check bounds
            if (block.x < 0 || block.x >= this.board.width) return false
            if (block.y < 0 || block.y >= this.board.height) return false
            // Check collision with existing blocks
            return this.board.isCellEmpty(block.x, block.y)
        })
    }

    /**
     * Try to move piece in a direction
     * Returns true if move was successful
     */
    private tryMove(dx: number, dy: number): boolean {
        if (this.isGameOver || this.isPaused) return false

        this.currentPiece.move(dx, dy)

        if (this.canPlacePiece(this.currentPiece)) {
            return true
        }

        // Revert move
        this.currentPiece.move(-dx, -dy)
        return false
    }

    /**
     * Move piece left
     */
    moveLeft(): boolean {
        return this.tryMove(-1, 0)
    }

    /**
     * Move piece right
     */
    moveRight(): boolean {
        return this.tryMove(1, 0)
    }

    /**
     * Move piece down (soft drop)
     */
    moveDown(): boolean {
        const moved = this.tryMove(0, 1)

        if (!moved) {
            // Piece can't move down, lock it
            this.lockPiece()
        }

        return moved
    }

    private lockPiece(): void {
        const blocks = this.currentPiece.getBlocks()
        const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

        blocks.forEach(block => {
            this.board.setCell(block.x, block.y, pieceColorIndex)
        })

        // Check for line clears
        const cleared = checkAndClearLines(this.board)
        if (cleared > 0) {
            this.linesCleared += cleared
            this.score += calculateScore(cleared, this.level)
            // Level up every 10 lines
            this.level = Math.floor(this.linesCleared / 10) + 1
        }

        // Spawn new piece
        this.currentPiece = this.spawnPiece()
    }

    /**
     * Rotate piece clockwise
     */
    rotate(): boolean {
        if (this.isGameOver || this.isPaused) return false

        this.currentPiece.rotate()

        if (this.canPlacePiece(this.currentPiece)) {
            return true
        }

        // Try wall kicks (simplified - just try moving left/right)
        const kicks = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: -2, dy: 0 },
            { dx: 2, dy: 0 },
            { dx: 0, dy: -1 },
        ]

        for (const kick of kicks) {
            this.currentPiece.move(kick.dx, kick.dy)
            if (this.canPlacePiece(this.currentPiece)) {
                return true
            }
            this.currentPiece.move(-kick.dx, -kick.dy)
        }

        // Revert rotation if no valid position found
        this.currentPiece.rotateCounterClockwise()
        return false
    }

    /**
     * Hard drop - instantly drop piece to bottom
     */
    hardDrop(): boolean {
        if (this.isGameOver || this.isPaused) return false

        let dropDistance = 0

        while (this.tryMove(0, 1)) {
            dropDistance++
        }

        // Add score for hard drop
        this.score += dropDistance * SCORE_HARD_DROP_PER_CELL

        // Lock the piece
        this.lockPiece()

        return true
    }

    /**
     * Get ghost piece (preview of where piece will land)
     */
    getGhostPiece(): Tetromino {
        const ghost = this.currentPiece.clone()

        while (true) {
            ghost.move(0, 1)
            if (!this.canPlacePieceGhost(ghost)) {
                ghost.move(0, -1)
                break
            }
        }

        return ghost
    }

    /**
     * Check if ghost piece can be placed (ignores current piece)
     */
    private canPlacePieceGhost(piece: Tetromino): boolean {
        const blocks = piece.getBlocks()
        return blocks.every(block => {
            if (block.x < 0 || block.x >= this.board.width) return false
            if (block.y < 0 || block.y >= this.board.height) return false
            return this.board.isCellEmpty(block.x, block.y)
        })
    }

    /**
     * Toggle pause state
     */
    togglePause(): void {
        this.isPaused = !this.isPaused
    }
}
