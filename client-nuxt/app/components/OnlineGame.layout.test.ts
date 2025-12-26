
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineGameVue from './OnlineGame.vue'
import { OnlineGame } from '~/game/OnlineGame'

// Mock dependencies
const PlayerBoard = { template: '<div></div>' }

describe('OnlineGame Layout', () => {
    it('shows Resume button INSIDE the local board overlay when PAUSED', async () => {
        // Create mock online game
        const game = new OnlineGame()
        game.isPaused = true
        game.isGameOver = false
        game.isOpponentConnected = true

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        const overlay = wrapper.find('.board-wrapper .board-overlay')
        expect(overlay.exists()).toBe(true)
        expect(overlay.text()).toContain('PAUSED')

        // Resume button should be inside
        const resumeBtn = overlay.find('button.resume-btn')
        expect(resumeBtn.exists()).toBe(true)
    })

    it('shows Game Over UI INSIDE the local board overlay when GAME OVER', async () => {
        const game = new OnlineGame()
        game.isPaused = false
        game.isGameOver = true

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        // Board overlay should be visible and contain the game over content
        const overlay = wrapper.find('.board-wrapper .board-overlay')
        expect(overlay.exists()).toBe(true)

        // Should contain result text
        expect(overlay.text()).toContain('GAME OVER')

        // Should contain Save/Exit buttons (now outside overlay)
        const saveBtn = wrapper.find('.save-btn')
        expect(saveBtn.exists()).toBe(true)
    })
})
