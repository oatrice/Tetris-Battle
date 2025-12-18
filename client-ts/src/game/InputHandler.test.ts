import { describe, it, expect, vi } from 'vitest';
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

    it('should ignore keys with modifiers (Cmd/Ctrl/Alt)', () => {
        const handler = new InputHandler();

        const keyR = new KeyboardEvent('keydown', { code: 'KeyR', metaKey: true });
        const keyP = new KeyboardEvent('keydown', { code: 'KeyP', ctrlKey: true });
        const arrow = new KeyboardEvent('keydown', { code: 'ArrowUp', altKey: true });

        expect(handler.handleInput(keyR)).toBeNull();
        expect(handler.handleInput(keyP)).toBeNull();
        expect(handler.handleInput(arrow)).toBeNull();
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

        it('should detect swipe down (hard drop)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 100, 160);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP);
        });

        it('should detect swipe up (hold)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 100, 40);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.HOLD);
        });

        it('should detect tap (rotate)', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 102, 102);
            handler.handleTouchStart(start);
            expect(handler.handleTouchEnd(end)).toBe(GameAction.ROTATE_CW);
        });

        it('should detect long touch (soft drop)', () => {
            vi.useFakeTimers();
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 102, 102);

            handler.handleTouchStart(start);
            vi.advanceTimersByTime(300); // Advance time passed threshold

            expect(handler.handleTouchEnd(end)).toBe(GameAction.SOFT_DROP);
            vi.useRealTimers();
        });
        it('should detect continuous swipe (DAS)', () => {
            const handler = new InputHandler();
            const start = {
                changedTouches: [{ clientX: 100, clientY: 100 }]
            } as unknown as TouchEvent;

            const move1 = {
                changedTouches: [{ clientX: 135, clientY: 100 }] // +35
            } as unknown as TouchEvent;

            const move2 = {
                changedTouches: [{ clientX: 170, clientY: 100 }] // +35 from move1
            } as unknown as TouchEvent;

            const end = {
                changedTouches: [{ clientX: 175, clientY: 100 }]
            } as unknown as TouchEvent;

            handler.handleTouchStart(start);

            // First move
            expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_RIGHT);

            // Second move
            expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_RIGHT);

            // End - shouldn't trigger tap or another move if small delta remains
            expect(handler.handleTouchEnd(end)).toBeNull();
        });

        it('should NOT trigger vertical swipe if moving horizontally with drift', () => {
            const handler = new InputHandler();
            const start = {
                changedTouches: [{ clientX: 100, clientY: 100 }]
            } as unknown as TouchEvent;

            // Move Right +35, Drift Down +5
            const move1 = {
                changedTouches: [{ clientX: 135, clientY: 105 }]
            } as unknown as TouchEvent;

            // Move Right +35 (total 70), Drift Down +10 (total 15)
            const move2 = {
                changedTouches: [{ clientX: 170, clientY: 115 }]
            } as unknown as TouchEvent;

            // End at +5 (total 75), Drift Down +25 (total 40)
            // Total Vertical Drift = 40 ( > Threshold 30)
            // Last Horizontal Step = 5 ( < Threshold 30)
            const end = {
                changedTouches: [{ clientX: 175, clientY: 140 }]
            } as unknown as TouchEvent;

            handler.handleTouchStart(start);

            // user swipes right
            expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_RIGHT);
            expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_RIGHT);

            // user lifts finger, but accumulated drift (40) is > threshold (30)
            // This should be ignored because we were moving horizontally
            expect(handler.handleTouchEnd(end)).toBeNull();
        });
    });
});
