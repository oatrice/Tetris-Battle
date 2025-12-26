import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LeaderboardService } from '../app/services/LeaderboardService'

describe('LeaderboardService', () => {

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear()
        vi.unstubAllGlobals()
    })

    it('should generate a valid UUID when crypto.randomUUID is available', () => {
        // Ensure crypto.randomUUID is available (Environment default usually)
        if (!globalThis.crypto) {
            Object.defineProperty(globalThis, 'crypto', {
                value: { randomUUID: () => 'native-uuid-1234' },
                writable: true
            })
        }

        const result = LeaderboardService.addScore({
            playerName: 'TestPlayer',
            score: 1000,
            level: 1,
            lines: 10,
            date: new Date().toISOString()
        })

        expect(result.id).toBeDefined()
        expect(typeof result.id).toBe('string')
        expect(result.id!.length).toBeGreaterThan(0)
    })

    it('should fall back to polyfill when crypto.randomUUID is NOT available (Android WebView)', () => {
        // Mock crypto being undefined or randomUUID missing
        const originalCrypto = globalThis.crypto;

        // Force remove crypto.randomUUID
        Object.defineProperty(globalThis, 'crypto', {
            value: undefined,
            writable: true
        });

        const result = LeaderboardService.addScore({
            playerName: 'PolyfillPlayer',
            score: 500,
            level: 1,
            lines: 5,
            date: new Date().toISOString()
        })

        expect(result.id).toBeDefined()
        expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

        // Restore
        if (originalCrypto) {
            Object.defineProperty(globalThis, 'crypto', {
                value: originalCrypto,
                writable: true
            })
        }
    })
})
