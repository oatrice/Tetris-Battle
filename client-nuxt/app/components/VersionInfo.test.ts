import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock virtual module FIRST
vi.mock('virtual:git-version', () => ({
    COMMIT_HASH: 'mock-hash',
    COMMIT_DATE: new Date().toISOString(),
    IS_DIRTY: false
}))

import VersionInfo from './VersionInfo.vue'

// Mock the composable
vi.mock('../composables/useVersionInfo', () => ({
    useVersionInfo: () => ({
        version: '1.0.0',
        commitHash: 'abc1234',
        commitDate: '2025-01-01',
        isDev: false,
        isDirty: false,
        isClient: true
    })
}))

describe('VersionInfo.vue', () => {
    const originalFetch = global.fetch

    beforeEach(() => {
        // DEBUG LOG
        console.log('TEST ENV: import.meta.client =', import.meta.client)

        vi.resetAllMocks()
        global.fetch = originalFetch
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('displays Lib Version when server responds with valid format', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('lib-v1.1.4')
        })

        const wrapper = mount(VersionInfo)
        await flushPromises()
        await wrapper.vm.$nextTick()

        expect(global.fetch).toHaveBeenCalled()
        expect(wrapper.text()).toContain('Lib: lib-v1.1.4')
    })

    it('hides Lib Version when fetch fails (e.g. Network Error)', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

        const wrapper = mount(VersionInfo)
        await flushPromises()

        expect(global.fetch).toHaveBeenCalled()
        expect(wrapper.text()).not.toContain('Lib:')
    })

    it('hides Lib Version when server returns 404 (Not Found)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            text: () => Promise.resolve('404 page not found')
        })

        const wrapper = mount(VersionInfo)
        await flushPromises()

        expect(wrapper.text()).not.toContain('Lib:')
    })

    it('hides Lib Version when server returns HTML fallback (Nuxt Dev Mode behavior)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            text: () => Promise.resolve('<!DOCTYPE html><html>...</html>')
        })

        const wrapper = mount(VersionInfo)
        await flushPromises()

        expect(wrapper.text()).not.toContain('Lib:')
        expect(wrapper.text()).not.toContain('DOCTYPE')
    })
})
