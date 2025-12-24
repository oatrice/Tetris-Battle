/**
 * SpecialGame - Special Mode with Cascade Gravity
 * 
 * Extends the base Game class with Puyo-style cascade gravity:
 * - After line clears, floating blocks drop individually with animation
 * - Chain reactions: if dropping creates new lines, they clear too
 * - Chain bonus: longer chains = more points
 */
import { Game } from './Game'
import { Tetromino } from './Tetromino'
import { applyGravity, clearLinesOnly } from './CascadeGravity'
import { calculateScore } from './LineClearing'

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

export class SpecialGame extends Game {
    chainCount: number = 0
    isCascading: boolean = false
    private cascadeTimer: number = 0
    private readonly CASCADE_DELAY: number = 500 // ms per gravity step

    constructor() {
        super()
        this.chainCount = 0
    }

    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    update(deltaTime: number): void {
        if (!this.isCascading) return

        this.cascadeTimer += deltaTime
        if (this.cascadeTimer >= this.CASCADE_DELAY) {
            const moved = applyGravity(this.board)
            this.cascadeTimer = 0

            if (!moved) {
                // Gravity settled - check for chain reaction
                const lines = clearLinesOnly(this.board)
                if (lines > 0) {
                    this.chainCount++
                    this.linesCleared += lines
                    this.score += calculateScore(lines, this.level) * this.chainCount
                    this.level = Math.floor(this.linesCleared / 10) + 1
                    console.log('[SpecialGame] Chain', this.chainCount, '- lines:', lines)
                    // Continue cascading
                } else {
                    // Done cascading
                    this.isCascading = false
                    this.spawnNextPiece()
                    console.log('[SpecialGame] Cascade complete')
                }
            }
        }
    }

    /**
     * Spawn next piece after cascade completes
     */
    private spawnNextPiece(): void {
        this.currentPiece = this.nextPiece
        this.nextPiece = this.spawnPiece()
        this.holdUsedThisTurn = false

        if (!this.canPlacePiece(this.currentPiece)) {
            this.isGameOver = true
        }
    }

    /**
     * Override lockPiece to start animated cascade instead of instant
     */
    protected override lockPiece(): void {
        const blocks = this.currentPiece.getBlocks()
        const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

        blocks.forEach(block => {
            this.board.setCell(block.x, block.y, pieceColorIndex)
        })

        // Clear lines (without gravity - that's handled by update())
        const lines = clearLinesOnly(this.board)
        console.log('[SpecialGame] lockPiece - initial lines:', lines)

        if (lines > 0) {
            this.chainCount = 1
            this.linesCleared += lines
            this.score += calculateScore(lines, this.level)
            this.level = Math.floor(this.linesCleared / 10) + 1

            // Start cascade animation
            this.isCascading = true
            this.cascadeTimer = 0
        } else {
            this.chainCount = 0
            this.spawnNextPiece()
        }
    }
}
