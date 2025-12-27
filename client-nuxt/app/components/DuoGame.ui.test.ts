
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DuoGameVue from './DuoGame.vue'
import { DuoGame } from '~/game/DuoGame'

// Mock sub-components
const PlayerBoard = { template: '<div class="player-board-stub"></div>' }

describe('DuoGame UI Touch Controls', () => {
    it('should have separate touch zones for P1 and P2', async () => {
        const game = new DuoGame()
        const wrapper = mount(DuoGameVue, {
            props: { duoGame: game },
            global: {
                stubs: { PlayerBoard }
            }
        })

        // Should find two distinct zones
        expect(wrapper.find('.p1-touch-zone').exists()).toBe(true)
        expect(wrapper.find('.p2-touch-zone').exists()).toBe(true)
    })

    it('should trigger P1 move left on P1 zone swipe', async () => {
        const game = new DuoGame()
        const p1MoveLeftSpy = vi.spyOn(game, 'p1MoveLeft')

        const wrapper = mount(DuoGameVue, {
            props: { duoGame: game },
            global: { stubs: { PlayerBoard } }
        })

        const p1Zone = wrapper.find('.p1-touch-zone')

        // Simulate Swipe Left on P1 Zone
        // Use plain objects for pseudo-touch events
        await p1Zone.trigger('touchstart', {
            changedTouches: [{ clientX: 100, clientY: 100, identifier: 1 }]
        })
        await p1Zone.trigger('touchmove', {
            changedTouches: [{ clientX: 50, clientY: 100, identifier: 1 }]
        })
        // Note: touchmove logic uses threshold (10px). 100->50 is 50px diff.

        expect(p1MoveLeftSpy).toHaveBeenCalled()
    })

    it('should trigger P2 move right on P2 zone swipe', async () => {
        const game = new DuoGame()
        const p2MoveRightSpy = vi.spyOn(game, 'p2MoveRight')

        const wrapper = mount(DuoGameVue, {
            props: { duoGame: game },
            global: { stubs: { PlayerBoard } }
        })

        const p2Zone = wrapper.find('.p2-touch-zone')

        // Simulate Swipe Right on P2 Zone
        await p2Zone.trigger('touchstart', {
            changedTouches: [{ clientX: 300, clientY: 100, identifier: 2 }]
        })
        await p2Zone.trigger('touchmove', {
            changedTouches: [{ clientX: 350, clientY: 100, identifier: 2 }]
        })

        expect(p2MoveRightSpy).toHaveBeenCalled()
    })
})
