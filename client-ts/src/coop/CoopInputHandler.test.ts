/**
 * CoopInputHandler.test.ts
 * Tests for Cooperative Mode Input Handler (including Touch Controls)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoopInputHandler } from './CoopInputHandler';
import { PlayerAction } from './DualPiece';

// Helper to create mock TouchEvent
const createTouchEvent = (clientX: number, clientY: number) => {
    return {
        changedTouches: [{ clientX, clientY }]
    } as unknown as TouchEvent;
};

describe('CoopInputHandler', () => {
    let handler: CoopInputHandler;

    beforeEach(() => {
        handler = new CoopInputHandler();
    });

    describe('Keyboard Controls', () => {
        it('should map Player 1 WASD controls', () => {
            const event = new KeyboardEvent('keydown', { code: 'KeyA' });
            expect(handler.handleInput(event)).toEqual({ player: 1, action: PlayerAction.MOVE_LEFT });

            const eventD = new KeyboardEvent('keydown', { code: 'KeyD' });
            expect(handler.handleInput(eventD)).toEqual({ player: 1, action: PlayerAction.MOVE_RIGHT });

            const eventW = new KeyboardEvent('keydown', { code: 'KeyW' });
            expect(handler.handleInput(eventW)).toEqual({ player: 1, action: PlayerAction.ROTATE });
        });

        it('should map Player 2 Arrow controls', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
            expect(handler.handleInput(event)).toEqual({ player: 2, action: PlayerAction.MOVE_LEFT });
        });
    });

    describe('Touch Controls (Mobile)', () => {
        it('should have handleTouchStart method', () => {
            expect(typeof handler.handleTouchStart).toBe('function');
        });

        it('should have handleTouchMove method', () => {
            expect(typeof handler.handleTouchMove).toBe('function');
        });

        it('should have handleTouchEnd method', () => {
            expect(typeof handler.handleTouchEnd).toBe('function');
        });

        it('should detect horizontal swipe left as MOVE_LEFT', () => {
            const start = createTouchEvent(200, 100);
            const end = createTouchEvent(100, 100); // -100px (swipe left)

            handler.handleTouchStart(start);
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.MOVE_LEFT);
        });

        it('should detect horizontal swipe right as MOVE_RIGHT', () => {
            const start = createTouchEvent(100, 100);
            const end = createTouchEvent(200, 100); // +100px (swipe right)

            handler.handleTouchStart(start);
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.MOVE_RIGHT);
        });

        it('should detect swipe down as HARD_DROP', () => {
            const start = createTouchEvent(100, 100);
            const end = createTouchEvent(100, 200); // +100px (swipe down)

            handler.handleTouchStart(start);
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.HARD_DROP);
        });

        it('should detect swipe up as HOLD', () => {
            const start = createTouchEvent(100, 200);
            const end = createTouchEvent(100, 100); // -100px (swipe up)

            handler.handleTouchStart(start);
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.HOLD);
        });

        it('should detect tap as ROTATE', () => {
            const start = createTouchEvent(100, 100);
            const end = createTouchEvent(102, 102); // small movement (tap)

            handler.handleTouchStart(start);
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.ROTATE);
        });

        it('should detect long press as SOFT_DROP', () => {
            vi.useFakeTimers();

            const start = createTouchEvent(100, 100);
            const end = createTouchEvent(102, 102); // small movement

            handler.handleTouchStart(start);
            vi.advanceTimersByTime(300); // Advance time past threshold
            const result = handler.handleTouchEnd(end);

            expect(result).not.toBeNull();
            expect(result?.action).toBe(PlayerAction.SOFT_DROP);

            vi.useRealTimers();
        });

        it('should support continuous swipe (DAS) via handleTouchMove', () => {
            const start = createTouchEvent(100, 100);
            const move1 = createTouchEvent(140, 100); // +40px
            const move2 = createTouchEvent(180, 100); // another +40px

            handler.handleTouchStart(start);

            const result1 = handler.handleTouchMove(move1);
            expect(result1).not.toBeNull();
            expect(result1?.action).toBe(PlayerAction.MOVE_RIGHT);

            const result2 = handler.handleTouchMove(move2);
            expect(result2).not.toBeNull();
            expect(result2?.action).toBe(PlayerAction.MOVE_RIGHT);
        });
    });
});
