import { describe, it, expect, vi } from 'vitest';
import { InputHandler, GameAction } from './InputHandler';

describe('InputHandler', () => {
    describe('Gestures', () => {
        const createTouchEvents = (startX: number, startY: number, endX: number, endY: number) => {
            const start = {
                changedTouches: [{ clientX: startX, clientY: startY }]
            } as unknown as TouchEvent;

            const end = {
                changedTouches: [{ clientX: endX, clientY: endY }]
            } as unknown as TouchEvent;

            return { start, end };
        };

        const createMoveEvent = (x: number, y: number) => {
            return {
                changedTouches: [{ clientX: x, clientY: y }]
            } as unknown as TouchEvent;
        };

        // 1. Vertical Swipe Regression
        it('Vertical Swipe Regression: Horizontal creep (5px) with large vertical (50px) should be HARD_DROP', () => {
            const handler = new InputHandler();
            const { start, end } = createTouchEvents(100, 100, 105, 150); // dx=5, dy=50

            handler.handleTouchStart(start);
            // No moves in between, just a quick swipe
            expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP);
        });

        // 2. Horizontal Swipe with Upward Drift (Hold Prevention)
        it('Horizontal Swipe with Upward Drift: Upward drift should be reset by horizontal moves, preventing accidental HOLD', () => {
            const handler = new InputHandler();
            const start = { changedTouches: [{ clientX: 100, clientY: 100 }] } as unknown as TouchEvent;

            // Move 1: Left 35 (100 -> 65), Up 10 (Drift)
            const move1 = { changedTouches: [{ clientX: 65, clientY: 90 }] } as unknown as TouchEvent;

            // Move 2: Left 35 (65 -> 30), Up 10 (90 -> 80)
            const move2 = { changedTouches: [{ clientX: 30, clientY: 80 }] } as unknown as TouchEvent;

            // End: Little move
            const end = { changedTouches: [{ clientX: 25, clientY: 70 }] } as unknown as TouchEvent;

            handler.handleTouchStart(start);

            expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_LEFT);
            expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_LEFT);

            // Should NOT trigger HOLD (Swipe Up)
            expect(handler.handleTouchEnd(end)).toBeNull();
        });

        // 3. Immediate Direction Change
        it('Immediate Direction Change: Move Right then Swipe Down should trigger HARD_DROP correctly', () => {
            const handler = new InputHandler();
            const start = { changedTouches: [{ clientX: 100, clientY: 100 }] } as unknown as TouchEvent;

            // Move Right (Reset Anchor)
            const moveRight = { changedTouches: [{ clientX: 140, clientY: 100 }] } as unknown as TouchEvent;

            // Swipe Down (from new anchor 140,100) -> to 140, 140 (dy=40)
            const end = { changedTouches: [{ clientX: 140, clientY: 140 }] } as unknown as TouchEvent;

            handler.handleTouchStart(start);

            expect(handler.handleTouchMove(moveRight)).toBe(GameAction.MOVE_RIGHT);
            // Anchor is now 140, 100.
            // End is 140, 140. dx=0, dy=40.
            // dy > Threshold(30) -> HARD_DROP.

            expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP);
        });

        // Existing tests (keep or reference). 
        // ideally we keep basic tests too, but to save file writing space I'll focus on these robust ones plus basics.
        // I will re-include the basic ones to be safe and "Robust"

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

        it('should detect continuous swipe (DAS)', () => {
            const handler = new InputHandler();
            const start = createMoveEvent(100, 100);
            const move1 = createMoveEvent(135, 100);
            const move2 = createMoveEvent(170, 100);

            handler.handleTouchStart(start);
            expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_RIGHT);
            expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_RIGHT);
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
    });

    // Key mappings
    it('should map Arrow keys', () => {
        const handler = new InputHandler();
        const left = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
        expect(handler.handleInput(left)).toBe(GameAction.MOVE_LEFT);
    });
});
