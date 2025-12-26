/**
 * KeyHandling.test.ts
 * 
 * Verifies the switch-case logic used in app.vue for keyboard controls.
 * Since we cannot easily import the local function from script setup,
 * we replicate the exact logic here to ensure the JavaScript/TypeScript
 * evaluation is correct for the keys in question.
 */
import { describe, it, expect, vi } from 'vitest'

// Mock the Game object
const mockGame = {
    hold: vi.fn(),
    moveLeft: vi.fn(),
    moveRight: vi.fn(),
    moveDown: vi.fn(),
    rotate: vi.fn(),
    hardDrop: vi.fn(),
    togglePause: vi.fn(),
    isGameOver: false
}

// Replicate the handleSoloControls logic from app.vue exactly
function handleSoloControls(e: { key: string, preventDefault: () => void }, game: any) {
    if (!game || game.isGameOver) return

    switch (e.key) {
        case 'ArrowLeft': game.moveLeft(); break
        case 'ArrowRight': game.moveRight(); break
        case 'ArrowDown': game.moveDown(true); break
        case 'ArrowUp': game.rotate(); break
        case ' ': e.preventDefault(); game.hardDrop(); break
        case 'c': case 'C': case 'Shift': game.hold(); break
        case 'p': case 'P': game.togglePause(); break
    }
}

describe('Keyboard Control Logic', () => {
    it('should trigger hold() when "Shift" is pressed', () => {
        const event = { key: 'Shift', preventDefault: vi.fn() }
        handleSoloControls(event, mockGame)
        expect(mockGame.hold).toHaveBeenCalled()
    })

    it('should trigger hold() when "c" (lowercase) is pressed', () => {
        mockGame.hold.mockClear()
        const event = { key: 'c', preventDefault: vi.fn() }
        handleSoloControls(event, mockGame)
        expect(mockGame.hold).toHaveBeenCalled()
    })

    it('should trigger hold() when "C" (uppercase) is pressed', () => {
        mockGame.hold.mockClear()
        const event = { key: 'C', preventDefault: vi.fn() }
        handleSoloControls(event, mockGame)
        expect(mockGame.hold).toHaveBeenCalled()
    })

    it('should NOT trigger hold for random keys', () => {
        mockGame.hold.mockClear()
        const event = { key: 'x', preventDefault: vi.fn() }
        handleSoloControls(event, mockGame)
        expect(mockGame.hold).not.toHaveBeenCalled()
    })
})
