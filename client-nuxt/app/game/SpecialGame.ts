/**
 * SpecialGame - Special Mode with Cascade Gravity
 * 
 * Extends the base Game class with Puyo-style cascade gravity:
 * - After line clears, floating blocks drop individually with animation
 * - Chain reactions: if dropping creates new lines, they clear too
 * - Chain bonus: longer chains = more points
 * - Visual effects for line clears
 */
import { Game } from './Game'
import { applyGravity, clearLinesOnly } from './CascadeGravity'
import { calculateScore } from './LineClearing'

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Effect colors based on lines cleared
const EFFECT_COLORS: Record<number, string> = {
    1: '#4DD0E1', // Cyan
    2: '#81C784', // Green
    3: '#FFB74D', // Orange
    4: '#FFF176', // Yellow (Tetris!)
}

export interface LineClearEffect {
    type: 'LINE_CLEAR'
    y: number
    timeLeft: number
    color: string
}

export class SpecialGame extends Game {
    chainCount: number = 0
    isCascading: boolean = false
    effects: LineClearEffect[] = []
    private cascadeTimer: number = 0
    private readonly CASCADE_DELAY: number = 150 // ms per gravity step
    private readonly EFFECT_DURATION: number = 300 // ms

    constructor() {
        super()
        this.chainCount = 0
    }

    /**
     * Add line clear effects for visual feedback
     */
    private addLineClearEffects(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'

        indices.forEach(y => {
            this.effects.push({
                type: 'LINE_CLEAR',
                y,
                timeLeft: this.EFFECT_DURATION,
                color
            })
        })
    }

    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    update(deltaTime: number): void {
        // Update effects
        this.effects = this.effects.filter(e => {
            e.timeLeft -= deltaTime
            return e.timeLeft > 0
        })

        if (!this.isCascading) return

        this.cascadeTimer += deltaTime
        if (this.cascadeTimer >= this.CASCADE_DELAY) {
            const moved = applyGravity(this.board)
            this.cascadeTimer = 0

            if (!moved) {
                // Gravity settled - check for chain reaction
                const result = clearLinesOnly(this.board)
                if (result.count > 0) {
                    this.chainCount++
                    this.linesCleared += result.count
                    this.score += calculateScore(result.count, this.level) * this.chainCount
                    this.level = Math.floor(this.linesCleared / 10) + 1

                    // Add visual effects for chain
                    this.addLineClearEffects(result.indices, result.count)

                    console.log('[SpecialGame] Chain', this.chainCount, '- lines:', result.count)
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
        const result = clearLinesOnly(this.board)
        console.log('[SpecialGame] lockPiece - initial lines:', result.count)

        if (result.count > 0) {
            this.chainCount = 1
            this.linesCleared += result.count
            this.score += calculateScore(result.count, this.level)
            this.level = Math.floor(this.linesCleared / 10) + 1

            // Add visual effects
            this.addLineClearEffects(result.indices, result.count)

            // Start cascade animation
            this.isCascading = true
            this.cascadeTimer = 0
        } else {
            this.chainCount = 0
            this.spawnNextPiece()
        }
    }
}
