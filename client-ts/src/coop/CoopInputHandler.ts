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
     * Get control scheme description for UI
     */
    getControlsDescription(): { player1: string; player2: string } {
        return {
            player1: 'WASD: Move/Rotate | Q: Hard Drop | E: Hold',
            player2: 'Arrows: Move/Rotate | Space: Hard Drop | Right Shift: Hold'
        };
    }
}
