/**
 * SpecialGame - Special Mode with Cascade Gravity
 * 
 * Extends the base Game class with Puyo-style cascade gravity:
 * - After line clears, floating blocks drop individually with animation
 * - Chain reactions: if dropping creates new lines, they clear too
 * - Chain bonus: longer chains = more points
 * - Explosion particle effects for line clears
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

// Particle interface for explosion effect
export interface Particle {
    x: number
    y: number
    vx: number // velocity x
    vy: number // velocity y
    size: number
    color: string
    life: number // 0-1, decreases over time
    gravity: number
}

export interface LineClearEffect {
    type: 'LINE_CLEAR'
    y: number
    timeLeft: number
    color: string
}

export type GameEffect = LineClearEffect | { type: 'PARTICLES' }

export class SpecialGame extends Game {
    chainCount: number = 0
    isCascading: boolean = false
    effects: LineClearEffect[] = []
    particles: Particle[] = []
    private cascadeTimer: number = 0
    private readonly CASCADE_DELAY: number = 150 // ms per gravity step
    private readonly EFFECT_DURATION: number = 300 // ms
    private readonly PARTICLE_LIFETIME: number = 800 // ms

    constructor() {
        super()
        this.chainCount = 0
    }

    /**
     * Create explosion particles for each cell in cleared lines
     */
    private createExplosionParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        const particlesPerCell = linesCount >= 4 ? 8 : (linesCount >= 2 ? 5 : 3)

        indices.forEach(y => {
            // Create particles for each cell in the row
            for (let x = 0; x < 10; x++) {
                for (let i = 0; i < particlesPerCell; i++) {
                    // Random direction explosion
                    const angle = Math.random() * Math.PI * 2
                    const speed = 2 + Math.random() * 4

                    this.particles.push({
                        x: x * 24 + 12, // Center of cell (CELL_SIZE = 24)
                        y: y * 24 + 12,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 2, // Bias upward
                        size: 3 + Math.random() * 4,
                        color: this.randomizeColor(color),
                        life: 1.0,
                        gravity: 0.15
                    })
                }
            }
        })
    }

    /**
     * Slightly randomize color for variety
     */
    private randomizeColor(baseColor: string): string {
        // Add some random brightness variation
        const variation = Math.random() * 0.3 - 0.15
        if (Math.random() > 0.7) {
            return '#ffffff' // Some white sparkles
        }
        return baseColor
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

        // Create explosion particles
        this.createExplosionParticles(indices, linesCount)
    }

    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    update(deltaTime: number): void {
        // Update line clear effects
        this.effects = this.effects.filter(e => {
            e.timeLeft -= deltaTime
            return e.timeLeft > 0
        })

        // Update particles
        const dt = deltaTime / 16 // Normalize to ~60fps
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += p.gravity * dt // Apply gravity
            p.life -= deltaTime / this.PARTICLE_LIFETIME
            p.size *= 0.98 // Shrink over time
            return p.life > 0 && p.size > 0.5
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
