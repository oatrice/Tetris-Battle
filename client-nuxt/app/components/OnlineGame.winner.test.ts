
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineGameVue from './OnlineGame.vue'
import { OnlineGame } from '~/game/OnlineGame'

// Mock dependencies
const PlayerBoard = { template: '<div></div>' }

describe('OnlineGame Winner State', () => {
    it('hides the overlay when the winner chooses to Continue', async () => {
        const game = new OnlineGame()
        game.isWinner = true
        game.isPaused = false // Continued
        game.isGameOver = false
        game.isOpponentConnected = true // Connected or not, if we won and continued, we are playing

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        // Overlay should NOT be visible because we are playing (not paused)
        const overlay = wrapper.find('.board-overlay')
        expect(overlay.exists()).toBe(false)
    })

    it('shows Save/Exit button below the board when isWinner is true, even if playing', async () => {
        const game = new OnlineGame()
        game.isWinner = true
        game.isPaused = false

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        // Check for Save button OUTSIDE the overlay
        // We expect it somewhere in player-section or similar
        const saveBtn = wrapper.find('button.persistent-save-btn')
        expect(saveBtn.exists()).toBe(true)
        expect(saveBtn.text()).toContain('Save')
    })
})
