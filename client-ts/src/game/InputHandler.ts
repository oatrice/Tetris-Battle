export enum GameAction {
    MOVE_LEFT = 'MOVE_LEFT',
    MOVE_RIGHT = 'MOVE_RIGHT',
    ROTATE_CW = 'ROTATE_CW',
    SOFT_DROP = 'SOFT_DROP',
    PAUSE = 'PAUSE',
    RESTART = 'RESTART'
}

export class InputHandler {
    private keyMap: Record<string, GameAction> = {
        ArrowLeft: GameAction.MOVE_LEFT,
        ArrowRight: GameAction.MOVE_RIGHT,
        ArrowUp: GameAction.ROTATE_CW,
        ArrowDown: GameAction.SOFT_DROP,
        KeyP: GameAction.PAUSE,
        KeyR: GameAction.RESTART
    };

    handleInput(event: KeyboardEvent): GameAction | null {
        return this.keyMap[event.code] || null;
    }
}
