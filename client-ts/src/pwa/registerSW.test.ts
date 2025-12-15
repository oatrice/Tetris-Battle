import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerSW } from './registerSW';

describe('Service Worker Registration', () => {
    // Save original if needed, but jsdom properties might be tricky to restore if strict.
    // However, defining property on window works for jsdom.

    beforeEach(() => {
        // Mock navigator.serviceWorker
        Object.defineProperty(window, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue({}),
                },
            },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        // Restore naturally handled by vitest if using vi.stubGlobal, but here we manually did defineProperty
        // For simplicity in this test, we can leave it or restart environment. 
        // But to pass the valid TS check, let's just use window provided by the DOM lib.
    });

    it('should register service worker if supported', async () => {
        await registerSW();
        expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
});
