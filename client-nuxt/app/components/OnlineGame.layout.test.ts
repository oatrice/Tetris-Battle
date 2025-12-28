
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineGameVue from './OnlineGame.vue'
import { OnlineGame } from '~/game/OnlineGame'

// Mock dependencies
const PlayerBoard = {
    template: `
    <div class="player-board-stub">
        <slot name="under-next"></slot>
    </div>`
}

describe('OnlineGame Layout', () => {
    it('renders the opponent board inside the PlayerBoard "under-next" slot', async () => {
        const game = new OnlineGame()
        game.opponentName = 'OpponentPlayer'

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        // Skip name input
        // @ts-ignore
        wrapper.vm.showNameInput = false
        await wrapper.vm.$nextTick()

        // Verify opponent board is inside the stubbed slot
        const opponentCanvas = wrapper.find('.player-board-stub canvas.game-canvas.opponent')
        expect(opponentCanvas.exists()).toBe(true)

        // Also verify the mini header exists
        expect(wrapper.find('.mini-header').exists()).toBe(true)
        expect(wrapper.text()).toContain('OpponentPlayer')
    })

    it('shows Resume button INSIDE the local board overlay when PAUSED', async () => {
        const game = new OnlineGame()
        game.isPaused = true
        game.isGameOver = false
        game.isOpponentConnected = true

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        // Simulate joined state
        // @ts-ignore
        wrapper.vm.showNameInput = false
        await wrapper.vm.$nextTick()

        const overlay = wrapper.find('.board-wrapper .board-overlay')
        expect(overlay.exists()).toBe(true)
        expect(overlay.text()).toContain('PAUSED')

        // Resume & Exit inside overlay
        expect(overlay.find('button.resume-btn').exists()).toBe(true)
        expect(overlay.find('button.home-btn').exists()).toBe(true) // Exit in overlay

        // Persistent Exit button should be HIDDEN when paused to avoid duplication
        const persistentExit = wrapper.find('.active-controls .home-btn')
        expect(persistentExit.exists()).toBe(false)
    })

    it('shows Game Over UI and Persistent Controls when GAME OVER', async () => {
        const game = new OnlineGame()
        game.isPaused = false
        game.isGameOver = true

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        // active-controls (simple exit) should be hidden in favor of winner-controls
        expect(wrapper.find('.active-controls').exists()).toBe(false)

        // Board overlay should be visible
        const overlay = wrapper.find('.board-wrapper .board-overlay')
        expect(overlay.exists()).toBe(true)
        expect(overlay.text()).toContain('GAME OVER')

        // Overlay should NOT contain Exit button (moved to persistent)
        expect(overlay.find('button.home-btn').exists()).toBe(false)

        // Persistent controls should be visible
        const winnerControls = wrapper.find('.winner-controls')
        expect(winnerControls.exists()).toBe(true)
        expect(winnerControls.find('.save-btn').text()).toContain('Save score')
        expect(winnerControls.find('.home-btn').text()).toContain('Exit')
    })

    it('shows Persistent Exit button when PLAYING (Active)', async () => {
        const game = new OnlineGame()
        game.isPaused = false
        game.isGameOver = false
        game.isOpponentConnected = true

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        // Simulate joined
        // @ts-ignore
        wrapper.vm.showNameInput = false
        await wrapper.vm.$nextTick()

        // Overlay should be hidden
        expect(wrapper.find('.board-overlay').exists()).toBe(false)

        // Persistent Exit button should be VISIBLE
        const persistentExit = wrapper.find('.active-controls .home-btn')
        expect(persistentExit.exists()).toBe(true)
        expect(persistentExit.text()).toContain('Exit')
    })
})
