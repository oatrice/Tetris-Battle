
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SoloGame from './SoloGame.vue'
import { Game } from '~/game/Game'

// Mock MiniPiece and Leaderboard to avoid rendering issues
const MiniPiece = { template: '<div></div>' }
const Leaderboard = { template: '<div></div>' }

describe('SoloGame Layout', () => {
    it('shows Resume and Back buttons INSIDE the board overlay when PAUSED', async () => {
        const game = new Game()
        game.isPaused = true
        game.isGameOver = false

        const wrapper = mount(SoloGame, {
            props: { game },
            global: {
                stubs: { MiniPiece, Leaderboard }
            }
        })

        // Find the overlay on the board
        const overlay = wrapper.find('.board-section .overlay')
        expect(overlay.exists()).toBe(true)
        expect(overlay.text()).toContain('PAUSED')

        // Check for buttons inside the overlay
        // These buttons currently exist OUTSIDE the overlay in .control-buttons
        // We want them INSIDE the overlay for better mobile UX
        const resumeBtn = overlay.find('button[title="Resume"]')
        const backBtn = overlay.find('button[title="Back to Menu"]')

        // This should FAIL initially because buttons are outside
        expect(resumeBtn.exists()).toBe(true)
        expect(backBtn.exists()).toBe(true)
    })

    // SoloGame doesn't have "You Win" generally (unless maybe special mode?), 
    // but it has "Game Over".
    // "Game Over" overlay already exists. We need to check if "Back to Menu" is inside it.
    it('shows Back button INSIDE the board overlay when GAME OVER', async () => {
        const game = new Game()
        game.isPaused = false
        game.isGameOver = true

        const wrapper = mount(SoloGame, {
            props: { game },
            global: {
                stubs: { MiniPiece, Leaderboard }
            }
        })

        const overlay = wrapper.find('.board-section .overlay.game-over')
        expect(overlay.exists()).toBe(true)
        expect(overlay.text()).toContain('GAME OVER')

        // "Back to Menu" or "Back to Main" button should be here
        // Currently there is "$emit('restart')" and "Leaderboard", but no "Back" button inside overlay?
        // The "Back" button is outside in .control-buttons.
        const backBtn = overlay.find('button[title="Back to Menu"]')

        // This should FAIL
        expect(backBtn.exists()).toBe(true)
    })
})
