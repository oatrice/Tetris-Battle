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

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const CELL_SIZE = 24
const BOARD_WIDTH = 10

// Effect types
export enum EffectType {
    EXPLOSION = 'explosion',  // Particles explode outward
    SPARKLE = 'sparkle',      // Sparkles float up
    WAVE = 'wave',            // Wave ripples from center
    SHATTER = 'shatter',      // Square fragments fall
    CLASSIC = 'classic'       // Simple flash only
}

export const EFFECT_LABELS: Record<EffectType, string> = {
    [EffectType.EXPLOSION]: '🎆 Explosion',
    [EffectType.SPARKLE]: '✨ Sparkle',
    [EffectType.WAVE]: '🌊 Wave',
    [EffectType.SHATTER]: '💥 Shatter',
    [EffectType.CLASSIC]: '⚡ Classic'
}

// Effect colors based on lines cleared
const EFFECT_COLORS: Record<number, string> = {
    1: '#4DD0E1', // Cyan
    2: '#81C784', // Green
    3: '#FFB74D', // Orange
    4: '#FFF176', // Yellow (Tetris!)
}

// Particle interface for various effects
export interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    color: string
    life: number
    gravity: number
    rotation?: number      // For shatter effect
    rotationSpeed?: number
    isSquare?: boolean     // For shatter effect
}

export interface LineClearEffect {
    type: 'LINE_CLEAR'
    y: number
    timeLeft: number
    color: string
}

export interface WaveEffect {
    type: 'WAVE'
    centerX: number
    centerY: number
    radius: number
    maxRadius: number
    color: string
    life: number
}

export type GameEffect = LineClearEffect | WaveEffect

export class SpecialGame extends Game {
    chainCount: number = 0
    isCascading: boolean = false
    effects: GameEffect[] = []
    particles: Particle[] = []
    effectType: EffectType = EffectType.EXPLOSION

    private cascadeTimer: number = 0
    private readonly CASCADE_DELAY: number = 150
    private readonly EFFECT_DURATION: number = 300
    private readonly PARTICLE_LIFETIME: number = 800

    constructor() {
        super()
        this.chainCount = 0
    }

    /**
     * Set the visual effect type
     */
    setEffectType(type: EffectType): void {
        this.effectType = type
    }

    /**
     * Create particles based on current effect type
     */
    private createParticles(indices: number[], linesCount: number): void {
        switch (this.effectType) {
            case EffectType.EXPLOSION:
                this.createExplosionParticles(indices, linesCount)
                break
            case EffectType.SPARKLE:
                this.createSparkleParticles(indices, linesCount)
                break
            case EffectType.WAVE:
                this.createWaveEffect(indices, linesCount)
                break
            case EffectType.SHATTER:
                this.createShatterParticles(indices, linesCount)
                break
            case EffectType.CLASSIC:
                // No particles, just flash
                break
        }
    }

    /**
     * 🎆 EXPLOSION - Particles explode outward
     */
    private createExplosionParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        const particlesPerCell = linesCount >= 4 ? 8 : (linesCount >= 2 ? 5 : 3)

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < particlesPerCell; i++) {
                    const angle = Math.random() * Math.PI * 2
                    const speed = 2 + Math.random() * 4

                    this.particles.push({
                        x: x * CELL_SIZE + CELL_SIZE / 2,
                        y: y * CELL_SIZE + CELL_SIZE / 2,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 2,
                        size: 3 + Math.random() * 4,
                        color: Math.random() > 0.7 ? '#ffffff' : color,
                        life: 1.0,
                        gravity: 0.15
                    })
                }
            }
        })
    }

    /**
     * ✨ SPARKLE - Sparkles float upward
     */
    private createSparkleParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        const particlesPerCell = linesCount >= 4 ? 6 : 4

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < particlesPerCell; i++) {
                    this.particles.push({
                        x: x * CELL_SIZE + Math.random() * CELL_SIZE,
                        y: y * CELL_SIZE + CELL_SIZE / 2,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -2 - Math.random() * 3,  // Float up
                        size: 2 + Math.random() * 3,
                        color: Math.random() > 0.5 ? '#ffffff' : color,
                        life: 1.0,
                        gravity: -0.02  // Negative gravity = float up
                    })
                }
            }
        })
    }

    /**
     * 🌊 WAVE - Ripple wave from center
     */
    private createWaveEffect(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'

        indices.forEach(y => {
            this.effects.push({
                type: 'WAVE',
                centerX: BOARD_WIDTH * CELL_SIZE / 2,
                centerY: y * CELL_SIZE + CELL_SIZE / 2,
                radius: 0,
                maxRadius: BOARD_WIDTH * CELL_SIZE,
                color,
                life: 1.0
            })
        })
    }

    /**
     * 💥 SHATTER - Square fragments fall down
     */
    private createShatterParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        const fragmentsPerCell = 4

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < fragmentsPerCell; i++) {
                    const offsetX = (i % 2) * (CELL_SIZE / 2)
                    const offsetY = Math.floor(i / 2) * (CELL_SIZE / 2)

                    this.particles.push({
                        x: x * CELL_SIZE + offsetX + CELL_SIZE / 4,
                        y: y * CELL_SIZE + offsetY + CELL_SIZE / 4,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -1 - Math.random() * 2,
                        size: CELL_SIZE / 2 - 2,
                        color: Math.random() > 0.3 ? color : this.darkenColor(color),
                        life: 1.0,
                        gravity: 0.25,
                        rotation: Math.random() * Math.PI,
                        rotationSpeed: (Math.random() - 0.5) * 0.3,
                        isSquare: true
                    })
                }
            }
        })
    }

    /**
     * Darken a hex color
     */
    private darkenColor(hex: string): string {
        const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 40)
        const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 40)
        const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 40)
        return `rgb(${r},${g},${b})`
    }

    /**
     * Add line clear effects for visual feedback
     */
    private addLineClearEffects(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'

        // Always add flash effect
        indices.forEach(y => {
            this.effects.push({
                type: 'LINE_CLEAR',
                y,
                timeLeft: this.EFFECT_DURATION,
                color
            })
        })

        // Create particles based on effect type
        this.createParticles(indices, linesCount)
    }

    /**
     * Update cascade gravity animation (call from game loop with deltaTime)
     */
    update(deltaTime: number): void {
        // Update line clear effects
        this.effects = this.effects.filter(e => {
            if (e.type === 'LINE_CLEAR') {
                e.timeLeft -= deltaTime
                return e.timeLeft > 0
            } else if (e.type === 'WAVE') {
                e.radius += deltaTime * 0.5  // Expand wave
                e.life -= deltaTime / 600
                return e.life > 0 && e.radius < e.maxRadius
            }
            return false
        })

        // Update particles
        const dt = deltaTime / 16
        this.particles = this.particles.filter(p => {
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += p.gravity * dt
            p.life -= deltaTime / this.PARTICLE_LIFETIME

            if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
                p.rotation += p.rotationSpeed * dt
            }

            if (!p.isSquare) {
                p.size *= 0.98
            }

            return p.life > 0 && p.size > 0.5
        })

        if (!this.isCascading) return

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
                    this.addLineClearEffects(result.indices, result.count)
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
            this.addLineClearEffects(result.indices, result.count)
            this.isCascading = true
            this.cascadeTimer = 0
        } else {
            this.chainCount = 0
            this.spawnNextPiece()
        }
    }
}
