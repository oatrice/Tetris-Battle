/**
 * ThaiInput.test.ts
 * 
 * Verifies layout-independent input handling using e.code
 */
import { describe, it, expect, vi } from 'vitest'

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

// Proposed new logic using e.code
// We use e.code for physical keys (WASD, C, P, Space)
// We need to support Arrows as well
function handleSoloControlsRobust(e: { key: string, code: string, preventDefault: () => void }, game: any) {
    if (!game || game.isGameOver) return

    // Use code for layout independence
    switch (e.code) {
        case 'ArrowLeft': game.moveLeft(); break
        case 'ArrowRight': game.moveRight(); break
        case 'ArrowDown': game.moveDown(true); break
        case 'ArrowUp': game.rotate(); break
        case 'Space': e.preventDefault(); game.hardDrop(); break

        // Letter mapping (layout independent)
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
            game.hold();
            break

        case 'KeyP':
        case 'Escape':
            game.togglePause();
            break
    }
}

describe('Thai Layout Input Logic', () => {
    it('should trigger hold() when pressing "C" on Thai layout (KeyC)', () => {
        mockGame.hold.mockClear()
        // Thai 'c' is 'แ'
        const event = { key: 'แ', code: 'KeyC', preventDefault: vi.fn() }
        handleSoloControlsRobust(event, mockGame)
        expect(mockGame.hold).toHaveBeenCalled()
    })

    it('should trigger hold() when pressing ShiftLeft', () => {
        mockGame.hold.mockClear()
        const event = { key: 'Shift', code: 'ShiftLeft', preventDefault: vi.fn() }
        handleSoloControlsRobust(event, mockGame)
        expect(mockGame.hold).toHaveBeenCalled()
    })

    it('should continue to support Arrow keys', () => {
        const event = { key: 'ArrowDown', code: 'ArrowDown', preventDefault: vi.fn() }
        handleSoloControlsRobust(event, mockGame)
        expect(mockGame.moveDown).toHaveBeenCalledWith(true)
    })
})
