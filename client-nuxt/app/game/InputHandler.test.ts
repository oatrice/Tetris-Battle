import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputHandler, GameAction } from './InputHandler'

describe('InputHandler', () => {
    let handler: InputHandler

    beforeEach(() => {
        handler = new InputHandler()
    })

    // ============ Helper Functions ============
    const createTouchEvents = (startX: number, startY: number, endX: number, endY: number) => {
        const start = {
            changedTouches: [{ clientX: startX, clientY: startY }]
        } as unknown as TouchEvent

        const end = {
            changedTouches: [{ clientX: endX, clientY: endY }]
        } as unknown as TouchEvent

        return { start, end }
    }

    const createMoveEvent = (x: number, y: number) => {
        return {
            changedTouches: [{ clientX: x, clientY: y }]
        } as unknown as TouchEvent
    }

    // ============ Keyboard Input Tests ============
    describe('Keyboard Input', () => {
        it('should map ArrowLeft to MOVE_LEFT', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' })
            expect(handler.handleInput(event)).toBe(GameAction.MOVE_LEFT)
        })

        it('should map ArrowRight to MOVE_RIGHT', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowRight' })
            expect(handler.handleInput(event)).toBe(GameAction.MOVE_RIGHT)
        })

        it('should map ArrowUp to ROTATE_CW', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowUp' })
            expect(handler.handleInput(event)).toBe(GameAction.ROTATE_CW)
        })

        it('should map ArrowDown to SOFT_DROP', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowDown' })
            expect(handler.handleInput(event)).toBe(GameAction.SOFT_DROP)
        })

        it('should map Space to HARD_DROP', () => {
            const event = new KeyboardEvent('keydown', { code: 'Space' })
            expect(handler.handleInput(event)).toBe(GameAction.HARD_DROP)
        })

        it('should map KeyC to HOLD', () => {
            const event = new KeyboardEvent('keydown', { code: 'KeyC' })
            expect(handler.handleInput(event)).toBe(GameAction.HOLD)
        })

        it('should map ShiftLeft to HOLD', () => {
            const event = new KeyboardEvent('keydown', { code: 'ShiftLeft' })
            expect(handler.handleInput(event)).toBe(GameAction.HOLD)
        })

        it('should map KeyP to PAUSE', () => {
            const event = new KeyboardEvent('keydown', { code: 'KeyP' })
            expect(handler.handleInput(event)).toBe(GameAction.PAUSE)
        })

        it('should return null for non-mapped keys', () => {
            const event = new KeyboardEvent('keydown', { code: 'KeyX' })
            expect(handler.handleInput(event)).toBeNull()
        })

        it('should ignore keys with modifier (Ctrl)', () => {
            const event = new KeyboardEvent('keydown', { code: 'ArrowLeft', ctrlKey: true })
            expect(handler.handleInput(event)).toBeNull()
        })
    })

    // ============ Touch Gesture Tests ============
    describe('Touch Gestures', () => {
        describe('Swipe Left', () => {
            it('should detect swipe left (dx=-60, dy=0)', () => {
                const { start, end } = createTouchEvents(100, 100, 40, 100)
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.MOVE_LEFT)
            })
        })

        describe('Swipe Right', () => {
            it('should detect swipe right (dx=60, dy=0)', () => {
                const { start, end } = createTouchEvents(100, 100, 160, 100)
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.MOVE_RIGHT)
            })
        })

        describe('Swipe Down (Hard Drop)', () => {
            it('should detect swipe down as HARD_DROP (dx=0, dy=50)', () => {
                const { start, end } = createTouchEvents(100, 100, 100, 150)
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP)
            })

            it('should detect swipe down with small horizontal drift as HARD_DROP', () => {
                const { start, end } = createTouchEvents(100, 100, 105, 150) // dx=5, dy=50
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.HARD_DROP)
            })
        })

        describe('Swipe Up (Hold)', () => {
            it('should detect swipe up as HOLD (dx=0, dy=-50)', () => {
                const { start, end } = createTouchEvents(100, 100, 100, 50)
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.HOLD)
            })
        })

        describe('Tap (Rotate)', () => {
            it('should detect tap as ROTATE_CW (dx=5, dy=5)', () => {
                const { start, end } = createTouchEvents(100, 100, 105, 105)
                handler.handleTouchStart(start)
                expect(handler.handleTouchEnd(end)).toBe(GameAction.ROTATE_CW)
            })
        })

        describe('Long Press (Soft Drop)', () => {
            it('should detect long press as SOFT_DROP (> 200ms)', () => {
                vi.useFakeTimers()
                const { start, end } = createTouchEvents(100, 100, 102, 102)

                handler.handleTouchStart(start)
                vi.advanceTimersByTime(300) // Advance time past threshold

                expect(handler.handleTouchEnd(end)).toBe(GameAction.SOFT_DROP)
                vi.useRealTimers()
            })
        })

        describe('DAS (Delayed Auto Shift)', () => {
            it('should detect continuous swipe right during touchmove', () => {
                const start = createMoveEvent(100, 100)
                const move1 = createMoveEvent(135, 100) // dx=35 > threshold
                const move2 = createMoveEvent(170, 100) // another step

                handler.handleTouchStart(start)
                expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_RIGHT)
                expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_RIGHT)
            })

            it('should detect continuous swipe left during touchmove', () => {
                const start = createMoveEvent(100, 100)
                const move1 = createMoveEvent(65, 100) // dx=-35
                const move2 = createMoveEvent(30, 100) // another step

                handler.handleTouchStart(start)
                expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_LEFT)
                expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_LEFT)
            })
        })

        describe('Edge Cases', () => {
            it('should not trigger HOLD during horizontal swipe with upward drift', () => {
                const start = createMoveEvent(100, 100)
                // Move Left 35px, Up 10px (drift)
                const move1 = createMoveEvent(65, 90)
                // Move Left 35px more, Up 10px more
                const move2 = createMoveEvent(30, 80)
                // End with small movement
                const end = createMoveEvent(25, 70)

                handler.handleTouchStart(start)
                expect(handler.handleTouchMove(move1)).toBe(GameAction.MOVE_LEFT)
                expect(handler.handleTouchMove(move2)).toBe(GameAction.MOVE_LEFT)
                // Should NOT trigger HOLD (Swipe Up) due to drift reset
                expect(handler.handleTouchEnd(end as unknown as TouchEvent)).toBeNull()
            })

            it('should trigger HARD_DROP after horizontal DAS then vertical swipe', () => {
                const start = createMoveEvent(100, 100)
                const moveRight = createMoveEvent(140, 100) // DAS right
                const end = createMoveEvent(140, 160) // Then swipe down

                handler.handleTouchStart(start)
                expect(handler.handleTouchMove(moveRight)).toBe(GameAction.MOVE_RIGHT)
                // After DAS, anchor moves to 140,100
                // End is 140,160 => dy=60 > threshold => HARD_DROP
                expect(handler.handleTouchEnd(end as unknown as TouchEvent)).toBe(GameAction.HARD_DROP)
            })
        })
    })
})
