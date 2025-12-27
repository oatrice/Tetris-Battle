/**
 * SpecialGame - Special Mode with Cascade Gravity
 * 
 * Extends the base Game class with Puyo-style cascade gravity:
 * - After line clears, floating blocks drop individually with animation
 * - Chain reactions: if dropping creates new lines, they clear too
 * - Chain bonus: longer chains = more points
 * - Multiple visual effect types for line clears
 */
import { Game } from './Game'
import { applyGravity, clearLinesOnly } from './CascadeGravity'
import { calculateScore } from './LineClearing'
import { EffectSystem, EffectType, EFFECT_LABELS, type Particle, type GameEffect, type LineClearEffect, type WaveEffect } from './EffectSystem'

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

// Re-export for consumers
export { EffectType, EFFECT_LABELS, type Particle, type GameEffect, type LineClearEffect, type WaveEffect }

export class SpecialGame extends Game {
    chainCount: number = 0
    isCascading: boolean = false

    // Effect system handles all visual effects
    readonly effectSystem = new EffectSystem()

    private cascadeTimer: number = 0
    private readonly CASCADE_DELAY: number = 150

    constructor() {
        super()
        this.chainCount = 0
        this.allowHold = true
    }

    // Delegate effect properties to effectSystem
    get particles(): Particle[] {
        return this.effectSystem.particles
    }

    get effects(): GameEffect[] {
        return this.effectSystem.effects
    }

    get effectType(): EffectType {
        return this.effectSystem.effectType
    }

    /**
     * Set the visual effect type
     */
    setEffectType(type: EffectType): void {
        this.effectSystem.setEffectType(type)
    }

    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    override update(deltaTime: number): void {
        // Update effects
        this.effectSystem.update(deltaTime)

        if (!this.isCascading) {
            super.update(deltaTime)
            return
        }

        this.cascadeTimer += deltaTime
        if (this.cascadeTimer >= this.CASCADE_DELAY) {
            const moved = applyGravity(this.board)
            this.cascadeTimer = 0

            if (!moved) {
                const result = clearLinesOnly(this.board)
                if (result.count > 0) {
                    this.chainCount++
                    this.linesCleared += result.count
                    this.score += calculateScore(result.count, this.level) * this.chainCount
                    this.level = Math.floor(this.linesCleared / 10) + 1

                    // Create visual effects
                    this.effectSystem.createEffects(result.indices, result.count)

                    console.log('[SpecialGame] Chain', this.chainCount, '- lines:', result.count)
                } else {
                    this.isCascading = false
                    this.spawnNextPiece()
                    console.log('[SpecialGame] Cascade complete')
                }
            }
        }
    }

    private spawnNextPiece(): void {
        this.currentPiece = this.nextPiece
        this.nextPiece = this.spawnPiece()
        this.holdUsedThisTurn = false

        if (!this.canPlacePiece(this.currentPiece)) {
            this.isGameOver = true
        }
    }

    protected override lockPiece(): void {
        const blocks = this.currentPiece.getBlocks()
        const pieceColorIndex = PIECE_TYPES.indexOf(this.currentPiece.type) + 1

        blocks.forEach(block => {
            this.board.setCell(block.x, block.y, pieceColorIndex)
        })

        const result = clearLinesOnly(this.board)
        console.log('[SpecialGame] lockPiece - initial lines:', result.count)

        if (result.count > 0) {
            this.chainCount = 1
            this.linesCleared += result.count
            this.score += calculateScore(result.count, this.level)
            this.level = Math.floor(this.linesCleared / 10) + 1

            // Create visual effects
            this.effectSystem.createEffects(result.indices, result.count)

            this.isCascading = true
            this.cascadeTimer = 0
        } else {
            this.chainCount = 0
            this.spawnNextPiece()
        }
    }
}
