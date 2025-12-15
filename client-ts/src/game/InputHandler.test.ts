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

    it('should map P and R keys to shortcuts', () => {
        const handler = new InputHandler();

        const pauseEvent = new KeyboardEvent('keydown', { code: 'KeyP' });
        expect(handler.handleInput(pauseEvent)).toBe('PAUSE');

        const restartEvent = new KeyboardEvent('keydown', { code: 'KeyR' });
        expect(handler.handleInput(restartEvent)).toBe('RESTART');
    });

    describe('Gestures', () => {
        const createTouchEvents = (startX: number, startY: number, endX: number, endY: number) => {
            // Mocking TouchEvent for simplicity in JSDOM environment
            const start = {
                changedTouches: [{ clientX: startX, clientY: startY }]
            } as unknown as TouchEvent;

            const end = {
                changedTouches: [{ clientX: endX, clientY: endY }]
            } as unknown as TouchEvent;

            return { start, end };
        };

        it('should detect swipe left', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 40, 100);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.MOVE_LEFT);
        });

        it('should detect swipe right', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 160, 100);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.MOVE_RIGHT);
        });

        it('should detect swipe down (soft drop)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 100, 160);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.SOFT_DROP);
        });

        it('should detect swipe up (hard drop)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 100, 40);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP);
        });

        it('should detect tap (rotate)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 102, 102);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.ROTATE_CW);
        });
    });
});
