/**
 * SpecialGame - Special Mode with Cascade Gravity
 * 
 * Extends the base Game class with Puyo-style cascade gravity:
 * - After line clears, floating blocks drop individually
 * - Chain reactions: if dropping creates new lines, they clear too
 * - Chain bonus: longer chains = more points
 */
import { Game } from './Game'
import { Tetromino } from './Tetromino'
import { cascadeClear } from './CascadeGravity'

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

export class SpecialGame extends Game {
    chainCount: number = 0

    constructor() {
        super()
        this.chainCount = 0
    }

    /**
     * Override lockPiece to use cascade gravity instead of standard line clearing
     */
    protected override lockPiece(): void {
        const blocks = this.currentPiece.getBlocks()
        const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

        blocks.forEach(block => {
            this.board.setCell(block.x, block.y, pieceColorIndex)
        })

        // Use cascade gravity instead of standard line clearing
        const result = cascadeClear(this.board, this.level)

        if (result.linesCleared > 0) {
            this.linesCleared += result.linesCleared
            this.score += result.score
            this.chainCount = result.chainCount
            // Level up every 10 lines
            this.level = Math.floor(this.linesCleared / 10) + 1
        } else {
            this.chainCount = 0
        }

        // Move next piece to current, spawn new next piece
        this.currentPiece = this.nextPiece
        this.nextPiece = this.spawnPiece()

        // Reset hold lock
        this.holdUsedThisTurn = false

        // Check if new current piece can be placed (game over)
        if (!this.canPlacePiece(this.currentPiece)) {
            this.isGameOver = true
        }
    }
}
