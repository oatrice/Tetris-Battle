/**
 * EffectSystem - Visual effects for line clears
 * 
 * Manages particles and effects for different visual styles:
 * - Explosion: Particles explode outward with gravity
 * - Sparkle: Particles float upward
 * - Wave: Expanding ring effect
 * - Shatter: Square fragments with rotation
 * - Classic: Simple flash only
 */

const CELL_SIZE = 24
const BOARD_WIDTH = 10

// Effect types
export enum EffectType {
    EXPLOSION = 'explosion',
    SPARKLE = 'sparkle',
    WAVE = 'wave',
    SHATTER = 'shatter',
    CLASSIC = 'classic'
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

// Particle interface
export interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    color: string
    life: number
    gravity: number
    rotation?: number
    rotationSpeed?: number
    isSquare?: boolean
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

export class EffectSystem {
    particles: Particle[] = []
    effects: GameEffect[] = []
    effectType: EffectType = EffectType.EXPLOSION

    private readonly EFFECT_DURATION = 300 // ms
    private readonly PARTICLE_LIFETIME = 800 // ms

    /**
     * Set the visual effect type
     */
    setEffectType(type: EffectType): void {
        this.effectType = type
    }

    /**
     * Create effects for cleared lines
     */
    createEffects(indices: number[], linesCount: number): void {
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
     * Update effects and particles
     */
    update(deltaTime: number): void {
        // Update line clear effects
        this.effects = this.effects.filter(e => {
            if (e.type === 'LINE_CLEAR') {
                e.timeLeft -= deltaTime
                return e.timeLeft > 0
            } else if (e.type === 'WAVE') {
                e.radius += deltaTime * 0.5
                e.life -= deltaTime / 600
                return e.life > 0 && e.radius < e.maxRadius
            }
            return false
        })

        // Update particles
        const dt = deltaTime / 16 // Normalize to ~60fps
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
    }

    /**
     * 🎆 EXPLOSION - Particles explode outward
     */
    private createExplosionParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        // More particles for bigger impact (12 for single, 15 for double+, 20 for tetris)
        const particlesPerCell = linesCount >= 4 ? 20 : (linesCount >= 2 ? 15 : 12)

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < particlesPerCell; i++) {
                    const angle = Math.random() * Math.PI * 2
                    const speed = 3 + Math.random() * 6

                    this.particles.push({
                        x: x * CELL_SIZE + CELL_SIZE / 2,
                        y: y * CELL_SIZE + CELL_SIZE / 2,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 3,
                        size: 4 + Math.random() * 5,
                        color: Math.random() > 0.6 ? '#ffffff' : color,
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
        // More sparkles for magical effect (12 for single, 15 for double+, 20 for tetris)
        const particlesPerCell = linesCount >= 4 ? 20 : (linesCount >= 2 ? 15 : 12)

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < particlesPerCell; i++) {
                    this.particles.push({
                        x: x * CELL_SIZE + Math.random() * CELL_SIZE,
                        y: y * CELL_SIZE + CELL_SIZE / 2,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -3 - Math.random() * 4,
                        size: 3 + Math.random() * 4,
                        color: Math.random() > 0.4 ? '#ffffff' : color,
                        life: 1.0,
                        gravity: -0.03
                    })
                }
            }
        })
    }

    /**
     * 🌊 WAVE - Ripple wave from center + floating particles
     */
    private createWaveEffect(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'

        indices.forEach(y => {
            // Wave ripple
            this.effects.push({
                type: 'WAVE',
                centerX: BOARD_WIDTH * CELL_SIZE / 2,
                centerY: y * CELL_SIZE + CELL_SIZE / 2,
                radius: 0,
                maxRadius: BOARD_WIDTH * CELL_SIZE,
                color,
                life: 1.0
            })

            // Add floating particles along the wave (more for higher combos)
            const waveParticles = linesCount >= 4 ? 15 : (linesCount >= 2 ? 12 : 10)
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < waveParticles; i++) {
                    this.particles.push({
                        x: x * CELL_SIZE + Math.random() * CELL_SIZE,
                        y: y * CELL_SIZE + CELL_SIZE / 2,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 2,
                        size: 3 + Math.random() * 3,
                        color: Math.random() > 0.5 ? '#ffffff' : color,
                        life: 1.0,
                        gravity: 0
                    })
                }
            }
        })
    }

    /**
     * 💥 SHATTER - Square fragments fall down
     */
    private createShatterParticles(indices: number[], linesCount: number): void {
        const color = EFFECT_COLORS[Math.min(linesCount, 4)] || '#ffffff'
        // More fragments for dramatic effect (8 for single, 10 for double+, 12 for tetris)
        const fragmentsPerCell = linesCount >= 4 ? 12 : (linesCount >= 2 ? 10 : 8)

        indices.forEach(y => {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                for (let i = 0; i < fragmentsPerCell; i++) {
                    const offsetX = (i % 3) * (CELL_SIZE / 3)
                    const offsetY = Math.floor(i / 3) * (CELL_SIZE / 2)

                    this.particles.push({
                        x: x * CELL_SIZE + offsetX + CELL_SIZE / 6,
                        y: y * CELL_SIZE + offsetY + CELL_SIZE / 4,
                        vx: (Math.random() - 0.5) * 5,
                        vy: -2 - Math.random() * 3,
                        size: CELL_SIZE / 3,
                        color: Math.random() > 0.3 ? color : this.darkenColor(color),
                        life: 1.0,
                        gravity: 0.3,
                        rotation: Math.random() * Math.PI,
                        rotationSpeed: (Math.random() - 0.5) * 0.5,
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
}
