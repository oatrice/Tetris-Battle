/**
 * useTouchControls - Composable for mobile touch input
 * 
 * Reusable touch control handler for all game modes.
 * Handles: Swipe, Tap, Long Press, DAS (Continuous Swipe)
 */
import { InputHandler, GameAction } from '~/game/InputHandler'
import type { Game } from '~/game/Game'

export interface TouchControlOptions {
    /** Check if game is paused before executing actions */
    checkPause?: boolean
    /** Check if countdown is active (for Online mode) */
    checkCountdown?: () => boolean
    /** Check if opponent is connected (for Online mode) */
    checkOpponentConnected?: () => boolean
    /** Custom hold behavior (e.g., Special mode restrictions) */
    onHold?: () => void
}

export function useTouchControls(
    gameGetter: () => Game | null,
    options: TouchControlOptions = {}
) {
    const inputHandler = new InputHandler()

    const executeAction = (action: GameAction | null) => {
        if (!action) return

        const game = gameGetter()
        if (!game) return

        // Check game over
        if (game.isGameOver) return

        // Check pause if required (default: true)
        if (options.checkPause !== false && game.isPaused) return

        // Check countdown (Online mode)
        if (options.checkCountdown && options.checkCountdown()) return

        // Check opponent connected (Online mode)
        if (options.checkOpponentConnected && !options.checkOpponentConnected()) return

        switch (action) {
            case GameAction.MOVE_LEFT:
                game.moveLeft()
                break
            case GameAction.MOVE_RIGHT:
                game.moveRight()
                break
            case GameAction.ROTATE_CW:
                game.rotate()
                break
            case GameAction.SOFT_DROP:
                game.moveDown()
                break
            case GameAction.HARD_DROP:
                game.hardDrop()
                break
            case GameAction.HOLD:
                if (options.onHold) {
                    options.onHold()
                } else {
                    game.hold()
                }
                break
            case GameAction.PAUSE:
                game.togglePause()
                break
        }
    }

    const handleTouchStart = (e: TouchEvent) => {
        // Don't hijack input field touches
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        inputHandler.handleTouchStart(e)
    }

    const handleTouchMove = (e: TouchEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        e.preventDefault() // Prevent scrolling
        const action = inputHandler.handleTouchMove(e)
        executeAction(action)
    }

    const handleTouchEnd = (e: TouchEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        const action = inputHandler.handleTouchEnd(e)
        executeAction(action)
    }

    return {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        executeAction
    }
}
