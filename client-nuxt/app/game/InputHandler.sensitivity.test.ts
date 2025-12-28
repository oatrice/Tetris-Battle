import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputHandler, GameAction } from './InputHandler'

describe('InputHandler Sensitivity', () => {
    let handler: InputHandler

    beforeEach(() => {
        handler = new InputHandler()
    })

    const createTouchEvents = (startX: number, startY: number, endX: number, endY: number) => {
        const start = {
            changedTouches: [{ clientX: startX, clientY: startY }]
        } as unknown as TouchEvent

        const end = {
            changedTouches: [{ clientX: endX, clientY: endY }]
        } as unknown as TouchEvent

        return { start, end }
    }

    it('REPRODUCTION: slightly diagonal down swipe should be recognized as horizontal move', () => {
        // User moves Right 30px, Down 35px.
        // Current Logic: dy (35) > dx (30) => Vertical (Hard Drop)
        // Desired Logic: maintain swipe left/right more => Should be Move Right
        const { start, end } = createTouchEvents(100, 100, 130, 135)

        handler.handleTouchStart(start)
        const result = handler.handleTouchEnd(end)

        // We expect this to be MOVE_RIGHT, but currently it will be HARD_DROP
        expect(result).toBe(GameAction.MOVE_RIGHT)
    })

    it('should still recognize distinct vertical swipe', () => {
        // User moves Right 10px, Down 50px.
        // Clearly Vertical.
        const { start, end } = createTouchEvents(100, 100, 110, 150)

        handler.handleTouchStart(start)
        const result = handler.handleTouchEnd(end)

        expect(result).toBe(GameAction.HARD_DROP)
    })
})
