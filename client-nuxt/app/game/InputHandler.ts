/**
 * InputHandler - Handles keyboard and touch input for Tetris
 * 
 * Touch Gestures:
 * - Swipe Left/Right: Move piece
 * - Swipe Down: Hard drop
 * - Swipe Up: Hold piece
 * - Tap: Rotate clockwise
 * - Long Press (200ms+): Soft drop
 * - Continuous Swipe (DAS): Auto-repeat movement
 */

export enum GameAction {
    MOVE_LEFT = 'MOVE_LEFT',
    MOVE_RIGHT = 'MOVE_RIGHT',
    ROTATE_CW = 'ROTATE_CW',
    SOFT_DROP = 'SOFT_DROP',
    HARD_DROP = 'HARD_DROP',
    PAUSE = 'PAUSE',
    RESTART = 'RESTART',
    HOLD = 'HOLD'
}

export class InputHandler {
    private keyMap: Record<string, GameAction> = {
        ArrowLeft: GameAction.MOVE_LEFT,
        ArrowRight: GameAction.MOVE_RIGHT,
        ArrowUp: GameAction.ROTATE_CW,
        ArrowDown: GameAction.SOFT_DROP,
        Space: GameAction.HARD_DROP,
        KeyP: GameAction.PAUSE,
        KeyR: GameAction.RESTART,
        KeyC: GameAction.HOLD,
        ShiftLeft: GameAction.HOLD
    }

    private touchStartX: number = 0
    private touchStartY: number = 0
    private touchStartTime: number = 0
    private touchMoved: boolean = false

    private readonly SWIPE_THRESHOLD = 10  // Lower = faster DAS movement
    private readonly TAP_THRESHOLD = 10
    private readonly LONG_PRESS_THRESHOLD = 200 // ms
    private readonly VERTICAL_RATIO = 1.5  // Vertical swipe must be 1.5x stronger than horizontal drift

    /**
     * Handle keyboard input
     * Returns GameAction or null if not mapped
     */
    handleInput(event: KeyboardEvent): GameAction | null {
        // Ignore keys with modifiers
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return null
        }
        return this.keyMap[event.code] || null
    }

    /**
     * Handle touch start - record initial position and time
     */
    handleTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0]
        if (!touch) return
        this.touchStartX = touch.clientX
        this.touchStartY = touch.clientY
        this.touchStartTime = Date.now()
        this.touchMoved = false
    }

    /**
     * Handle touch move - detect continuous swipe (DAS)
     * Returns action for each step of horizontal swipe
     */
    handleTouchMove(event: TouchEvent): GameAction | null {
        const touch = event.changedTouches[0]
        if (!touch) return null
        const dx = touch.clientX - this.touchStartX
        const dy = touch.clientY - this.touchStartY

        // Only handle horizontal movement during move (for DAS)
        if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Reset anchor point for next step
                this.touchStartX = touch.clientX
                this.touchStartY = touch.clientY
                this.touchMoved = true
                return dx > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT
            }
        }

        return null
    }

    /**
     * Handle touch end - detect final gesture
     * - Tap: Rotate
     * - Long Press: Soft Drop
     * - Swipe: Move/Drop/Hold
     */
    handleTouchEnd(event: TouchEvent): GameAction | null {
        const touch = event.changedTouches[0]
        if (!touch) return null
        const touchEndX = touch.clientX
        const touchEndY = touch.clientY

        const dx = touchEndX - this.touchStartX
        const dy = touchEndY - this.touchStartY
        const duration = Date.now() - this.touchStartTime

        // TAP or LONG PRESS detection (small movement)
        if (!this.touchMoved && Math.abs(dx) < this.TAP_THRESHOLD && Math.abs(dy) < this.TAP_THRESHOLD) {
            if (duration > this.LONG_PRESS_THRESHOLD) {
                return GameAction.SOFT_DROP
            }
            return GameAction.ROTATE_CW
        }

        // SWIPE detection
        // Prioritize Horizontal unless Vertical is significantly dominant (to prevent accidental drops)
        if (Math.abs(dy) > Math.abs(dx) * this.VERTICAL_RATIO) {
            // Vertical Swipe
            if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
                return dy > 0 ? GameAction.HARD_DROP : GameAction.HOLD
            }
        } else {
            // Horizontal Swipe (Default if not strongly vertical)
            if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
                return dx > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT
            }
        }

        return null
    }
}
