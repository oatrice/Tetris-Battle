/**
 * CoopInputHandler.ts
 * Input handler for Cooperative Mode
 * Supports dual keyboard controls for 2 players
 */

import { PlayerAction } from './DualPiece';

export class CoopInputHandler {
    // Player 1 controls (WASD + Q/E)
    private player1KeyMap: Record<string, PlayerAction> = {
        KeyA: PlayerAction.MOVE_LEFT,
        KeyD: PlayerAction.MOVE_RIGHT,
        KeyW: PlayerAction.ROTATE,
        KeyS: PlayerAction.SOFT_DROP,
        KeyQ: PlayerAction.HARD_DROP,
        KeyE: PlayerAction.HOLD
    };

    // Player 2 controls (Arrow Keys + Space/Shift)
    private player2KeyMap: Record<string, PlayerAction> = {
        ArrowLeft: PlayerAction.MOVE_LEFT,
        ArrowRight: PlayerAction.MOVE_RIGHT,
        ArrowUp: PlayerAction.ROTATE,
        ArrowDown: PlayerAction.SOFT_DROP,
        Space: PlayerAction.HARD_DROP,
        ShiftRight: PlayerAction.HOLD
    };

    // Touch state
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private touchMoved: boolean = false;
    private readonly SWIPE_THRESHOLD = 30;
    private readonly TAP_THRESHOLD = 10;
    private readonly LONG_PRESS_THRESHOLD = 200; // ms

    /**
     * Handle keyboard input and return player number + action
     */
    handleInput(event: KeyboardEvent): { player: 1 | 2; action: PlayerAction } | null {
        // Ignore modifier keys
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return null;
        }

        // Check Player 1 controls
        const p1Action = this.player1KeyMap[event.code];
        if (p1Action) {
            return { player: 1, action: p1Action };
        }

        // Check Player 2 controls
        const p2Action = this.player2KeyMap[event.code];
        if (p2Action) {
            return { player: 2, action: p2Action };
        }

        return null;
    }

    /**
     * Handle touch start event
     */
    handleTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.touchMoved = false;
    }

    /**
     * Handle touch move event (for DAS - continuous swipe)
     * Returns action if threshold is crossed
     */
    handleTouchMove(event: TouchEvent): { action: PlayerAction } | null {
        const touch = event.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;

        if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
            // Only handle horizontal here for DAS
            if (Math.abs(dx) > Math.abs(dy)) {
                this.touchStartX = touch.clientX; // Reset start for next step
                this.touchStartY = touch.clientY; // Reset Y to prevent drift accumulation
                this.touchMoved = true;
                return { action: dx > 0 ? PlayerAction.MOVE_RIGHT : PlayerAction.MOVE_LEFT };
            }
        }
        return null;
    }

    /**
     * Handle touch end event
     * Detects: swipe, tap (rotate), long press (soft drop)
     */
    handleTouchEnd(event: TouchEvent): { action: PlayerAction } | null {
        const touch = event.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;

        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;
        const duration = Date.now() - this.touchStartTime;

        // Tap detection (small movement)
        if (!this.touchMoved && Math.abs(dx) < this.TAP_THRESHOLD && Math.abs(dy) < this.TAP_THRESHOLD) {
            if (duration > this.LONG_PRESS_THRESHOLD) {
                return { action: PlayerAction.SOFT_DROP };
            }
            return { action: PlayerAction.ROTATE };
        }

        // Swipe detection
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal Swipe
            if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
                return { action: dx > 0 ? PlayerAction.MOVE_RIGHT : PlayerAction.MOVE_LEFT };
            }
        } else {
            // Vertical Swipe
            if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
                return { action: dy > 0 ? PlayerAction.HARD_DROP : PlayerAction.HOLD };
            }
        }

        return null;
    }

    /**
     * Get control scheme description for UI
     */
    getControlsDescription(): { player1: string; player2: string } {
        return {
            player1: 'WASD: Move/Rotate | Q: Hard Drop | E: Hold',
            player2: 'Arrows: Move/Rotate | Space: Hard Drop | Right Shift: Hold'
        };
    }
}
