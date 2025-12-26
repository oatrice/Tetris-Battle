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
    /** Custom action handler - overrides default game method calls (for DuoGame P1) */
    customAction?: (action: GameAction) => void
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

        // Use custom action handler if provided (for DuoGame P1)
        if (options.customAction) {
            options.customAction(action)
            return
        }

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

        const game = gameGetter()
        // Allow scrolling if game is paused or over
        if (game && (game.isPaused || game.isGameOver)) return

        if (e.cancelable) e.preventDefault() // Prevent scrolling during gameplay

        const action = inputHandler.handleTouchMove(e)
        executeAction(action)
    }

    const handleTouchEnd = (e: TouchEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return

        // Ensure we don't trigger drops if we were just scrolling (optional, but safe)
        // inputHandler handles state reset on end

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
