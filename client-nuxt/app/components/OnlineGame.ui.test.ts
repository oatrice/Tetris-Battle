
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineGameVue from './OnlineGame.vue'
import { OnlineGame } from '~/game/OnlineGame'

// Mock dependencies
const PlayerBoard = { template: '<div><slot name="under-next"></slot></div>' }

// Helper to set userAgent
const setMobileUserAgent = (isMobile: boolean) => {
    Object.defineProperty(navigator, 'userAgent', {
        value: isMobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
    })
}

describe('OnlineGame Controls Hint', () => {
    const originalUserAgent = navigator.userAgent

    afterEach(() => {
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        })
    })

    it('shows "Swipe" controls hint on mobile devices', async () => {
        setMobileUserAgent(true)

        const game = new OnlineGame()
        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        const controlsHint = wrapper.find('.controls-hint')
        expect(controlsHint.exists()).toBe(true)
        expect(controlsHint.text()).toContain('Swipe')
        expect(controlsHint.text()).not.toContain('WASD')
    })

    it('shows "WASD" controls hint on desktop devices', async () => {
        setMobileUserAgent(false)

        const game = new OnlineGame()
        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: { stubs: { PlayerBoard } }
        })

        const controlsHint = wrapper.find('.controls-hint')
        expect(controlsHint.exists()).toBe(true)
        expect(controlsHint.text()).toContain('WASD')
    })
})

describe('OnlineGame UI States', () => {
    it('shows WIN screen (not Waiting) when opponent invalidates connection after we win', async () => {
        // [SCENARIO]
        // 1. We win.
        // 2. Opponent disconnects (isOpponentConnected = false).
        // 3. We should still see "You Win", NOT "Waiting...".

        const game = new OnlineGame()
        game.isWinner = true
        game.isGameOver = false // Technically game over for match, but logic might vary. 
        // In previous fix, we set isGameOver=false if we continue? 
        // Wait, if we win, isGameOver is usually false (we keep playing?) 
        // Actually, isWinner implies we caused opponent game over.
        // But let's check OnlineGame.ts logic: "Opponent lost! You win! isWinner=true, isPaused=true" 
        // It does NOT set isGameOver=true for us immediately? 
        // Correct, we can continue playing.

        game.isPaused = true
        game.isOpponentConnected = false // This triggers the bug

        const wrapper = mount(OnlineGameVue, {
            props: { onlineGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        // Simulate user has already joined
        // @ts-ignore
        wrapper.vm.showNameInput = false
        await wrapper.vm.$nextTick()

        // Check for Waiting Overlay
        // The text 'Waiting...' is in the waiting overlay
        const waitingText = wrapper.text().includes('Waiting...')

        // This expectation fails currently because isWaiting is true
        expect(waitingText).toBe(false)

        // Check for Win UI
        const winText = wrapper.text().includes('YOU WIN!')
        expect(winText).toBe(true)
    })
})
