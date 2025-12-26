
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OnlineGameVue from './OnlineGame.vue'
import { OnlineGame } from '~/game/OnlineGame'

// Mock dependencies
const PlayerBoard = { template: '<div></div>' }

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
