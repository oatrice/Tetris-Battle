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
    };

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private readonly SWIPE_THRESHOLD = 30;
    private readonly TAP_THRESHOLD = 10;

    handleInput(event: KeyboardEvent): GameAction | null {
        // Prepare modifier keys check
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return null;
        }
        return this.keyMap[event.code] || null;
    }

    private touchStartTime: number = 0;
    private readonly LONG_PRESS_THRESHOLD = 200; // ms
    private touchMoved: boolean = false;

    handleTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.touchMoved = false;
    }

    handleTouchMove(event: TouchEvent): GameAction | null {
        const touch = event.changedTouches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;

        if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
            // Only handle horizontal here for DAS
            if (Math.abs(dx) > Math.abs(dy)) {
                this.touchStartX = touch.clientX; // Reset start for next step
                this.touchStartY = touch.clientY; // Reset Y to prevent drift accumulation
                this.touchMoved = true;
                return dx > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT;
            }
        }
        return null;
    }

    handleTouchEnd(event: TouchEvent): GameAction | null {
        const touch = event.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;

        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;
        const duration = Date.now() - this.touchStartTime;

        if (!this.touchMoved && Math.abs(dx) < this.TAP_THRESHOLD && Math.abs(dy) < this.TAP_THRESHOLD) {
            if (duration > this.LONG_PRESS_THRESHOLD) {
                return GameAction.SOFT_DROP;
            }
            return GameAction.ROTATE_CW;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal Swipe (Remainder)
            if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
                return dx > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT;
            }
        } else {
            // Vertical Swipe - Should we allow vertical if moved horizontally?
            // Usually not mixed. Let's rely on checking if it's "mostly vertical".
            // If we moved horizontally, touchStartX shifted, so dx is small.
            // dy is still valid against touchStartY.

            // However, we want to prevent accidental hard drops after DAS.
            // But if user drags Right then Down?
            // Let's allow it if it clears threshold.
            if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
                return dy > 0 ? GameAction.HARD_DROP : GameAction.HOLD;
            }
        }

        return null;
    }
}
