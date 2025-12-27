import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LANGame from './LANGame.vue'

describe('LANGame Scanner', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        localStorage.clear()
    })

    it('scans for hosts and displays results', async () => {
        const fetchMock = vi.fn().mockImplementation((url) => {
            if (url === 'http://192.168.1.42:8080/debug/version') {
                return Promise.resolve({
                    ok: true,
                    text: () => Promise.resolve('lib-v1.1.6')
                })
            }
            return Promise.reject(new Error('Network Error'))
        })
        global.fetch = fetchMock

        const wrapper = mount(LANGame, {
            props: { connected: false }
        })

        await wrapper.find('.lan-btn.join').trigger('click')
        const scanBtn = wrapper.find('.scan-btn')
        expect(scanBtn.exists()).toBe(true)

        await scanBtn.trigger('click')
        await vi.runAllTimersAsync()
        expect(wrapper.text()).toContain('192.168.1.42')

        const foundItem = wrapper.find('.found-host')
        await foundItem.trigger('click')

        const input = wrapper.find('input[type="text"]')
        expect((input.element as HTMLInputElement).value).toBe('192.168.1.42')
    })

    it('remembers and manages IP history', async () => {
        const wrapper = mount(LANGame, {
            props: { connected: false }
        })

        await wrapper.find('.lan-btn.join').trigger('click')
        const input = wrapper.find('input[type="text"]')
        await input.setValue('192.168.1.100')

        await wrapper.find('.start-btn').trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Recent:')
        // Advance timers (if any) and manually reset connecting for test isolation logic
        await vi.runAllTimersAsync()
            // Simulate that connection failed or finished, so we can click again
            ; (wrapper.vm as any).connecting = false
        await wrapper.vm.$nextTick()

        const deleteBtn = wrapper.find('.delete-history-btn')
        await deleteBtn.trigger('click')
        await wrapper.vm.$nextTick()
        expect(wrapper.text()).not.toContain('192.168.1.100')

        await input.setValue('10.0.0.99')
        await wrapper.find('.start-btn').trigger('click')
        await wrapper.vm.$nextTick()
        expect(wrapper.text()).toContain('10.0.0.99')

        const clearBtn = wrapper.find('.clear-history-btn')
        await clearBtn.trigger('click')
        await wrapper.vm.$nextTick()
        expect(wrapper.text()).not.toContain('10.0.0.99')
    })

    it('scans the correct subnet based on input', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false })
        global.fetch = fetchMock

        const wrapper = mount(LANGame, {
            props: { connected: false }
        })

        await wrapper.find('.lan-btn.join').trigger('click')
        const input = wrapper.find('input[type="text"]')

        // User enters a specific subnet IP
        await input.setValue('172.16.0.5')

        await wrapper.find('.scan-btn').trigger('click')
        await vi.runAllTimersAsync()

        // Check if fetch was called with 172.16.0.x
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('http://172.16.0.1:'),
            expect.any(Object)
        )
    })
})
