import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerSW } from './registerSW';

describe('Service Worker Registration', () => {
    const originalNavigator = global.navigator;

    beforeEach(() => {
        // Mock navigator.serviceWorker
        Object.defineProperty(global, 'navigator', {
            value: {
                serviceWorker: {
                    register: vi.fn().mockResolvedValue({}),
                },
            },
            writable: true,
        });
    });

    afterEach(() => {
        global.navigator = originalNavigator;
    });

    it('should register service worker if supported', async () => {
        await registerSW();
        expect(navigator.serviceWorker.register).toHaveBeenCalledTimes(1);
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
});
