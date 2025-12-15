import { describe, it, expect } from 'vitest';
import { InputHandler, GameAction } from './InputHandler';

describe('InputHandler', () => {
    it('should map Arrow keys to correct actions', () => {
        const handler = new InputHandler();

        const leftEvent = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
        expect(handler.handleInput(leftEvent)).toBe(GameAction.MOVE_LEFT);

        const rightEvent = new KeyboardEvent('keydown', { code: 'ArrowRight' });
        expect(handler.handleInput(rightEvent)).toBe(GameAction.MOVE_RIGHT);

        const upEvent = new KeyboardEvent('keydown', { code: 'ArrowUp' });
        expect(handler.handleInput(upEvent)).toBe(GameAction.ROTATE_CW);

        const downEvent = new KeyboardEvent('keydown', { code: 'ArrowDown' });
        expect(handler.handleInput(downEvent)).toBe(GameAction.SOFT_DROP);
    });

    it('should return null for unmapped keys', () => {
        const handler = new InputHandler();
        const invalidEvent = new KeyboardEvent('keydown', { code: 'KeyQ' });
        expect(handler.handleInput(invalidEvent)).toBeNull();
    });
});
