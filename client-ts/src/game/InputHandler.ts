export enum GameAction {
    MOVE_LEFT = 'MOVE_LEFT',
    MOVE_RIGHT = 'MOVE_RIGHT',
    ROTATE_CW = 'ROTATE_CW',
    SOFT_DROP = 'SOFT_DROP',
    HARD_DROP = 'HARD_DROP',
    PAUSE = 'PAUSE',
    RESTART = 'RESTART'
}

export class InputHandler {
    private keyMap: Record<string, GameAction> = {
        ArrowLeft: GameAction.MOVE_LEFT,
        ArrowRight: GameAction.MOVE_RIGHT,
        ArrowUp: GameAction.ROTATE_CW,
        ArrowDown: GameAction.SOFT_DROP,
        Space: GameAction.HARD_DROP,
        KeyP: GameAction.PAUSE,
        KeyR: GameAction.RESTART
    };

    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private readonly SWIPE_THRESHOLD = 30;
    private readonly TAP_THRESHOLD = 10;

    handleInput(event: KeyboardEvent): GameAction | null {
        return this.keyMap[event.code] || null;
    }

    handleTouchStart(event: TouchEvent): void {
        const touch = event.changedTouches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    handleTouchEnd(event: TouchEvent): GameAction | null {
        const touch = event.changedTouches[0];
        const touchEndX = touch.clientX;
        const touchEndY = touch.clientY;

        const dx = touchEndX - this.touchStartX;
        const dy = touchEndY - this.touchStartY;

        if (Math.abs(dx) < this.TAP_THRESHOLD && Math.abs(dy) < this.TAP_THRESHOLD) {
            return GameAction.ROTATE_CW;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal Swipe
            if (Math.abs(dx) > this.SWIPE_THRESHOLD) {
                return dx > 0 ? GameAction.MOVE_RIGHT : GameAction.MOVE_LEFT;
            }
        } else {
            // Vertical Swipe
            if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
                return dy > 0 ? GameAction.HARD_DROP : GameAction.SOFT_DROP;
            }
        }

        return null;
    }
}
