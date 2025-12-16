import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Service Worker Strategy', () => {
    let fetchListener: (event: any) => void;

    // Mock global objects expected by sw.js
    const globalAny = global as any;

    beforeEach(() => {
        // Reset mocks
        vi.restoreAllMocks();

        // Mock self.addEventListener
        globalAny.self = {
            addEventListener: vi.fn((event, callback) => {
                if (event === 'fetch') {
                    fetchListener = callback;
                }
            }),
            skipWaiting: vi.fn(),
            clients: {
                claim: vi.fn()
            }
        };

        // Mock caches
        globalAny.caches = {
            open: vi.fn().mockResolvedValue({
                put: vi.fn(),
                addAll: vi.fn()
            }),
            match: vi.fn(),
            keys: vi.fn().mockResolvedValue([]),
            delete: vi.fn()
        };

        // Mock fetch
        globalAny.fetch = vi.fn();
    });

    it('should use Network First strategy for navigation requests (HTML)', async () => {
        // 1. Read the SW file content
        const swPath = path.resolve(__dirname, '../../public/sw.js');
        const swContent = fs.readFileSync(swPath, 'utf-8');

        // 2. Execute the SW code to register listeners
        // Using new Function to run in global scope context is tricky, 
        // effectively we just want to run the side effects.
        // eval(swContent) runs in current scope.
        eval(swContent);

        expect(fetchListener).toBeDefined();

        // 3. Setup the test case
        const requestUrl = 'http://localhost/index.html';
        const request = {
            url: requestUrl,
            mode: 'navigate', // Indicates a navigation request (page load)
            method: 'GET'
        };

        const event = {
            request,
            respondWith: vi.fn()
        };

        // 4. Setup mock data
        const cachedResponse = {
            clone: () => ({}),
            text: async () => 'Old UI'
        }; // Old cached version

        const networkResponse = {
            clone: () => ({}),
            status: 200,
            type: 'basic',
            text: async () => 'New UI'
        }; // New server version

        // Mock cache to return old version
        globalAny.caches.match.mockResolvedValue(cachedResponse);

        // Mock network to return new version
        globalAny.fetch.mockResolvedValue(networkResponse);

        // 5. Trigger the fetch listener
        fetchListener(event);

        // 6. Wait for the promise passed to respondWith to resolve
        const promiseBound = event.respondWith.mock.calls[0][0];
        const response = await promiseBound;

        // 7. Assertion
        // We expect the response to be the network response (New UI), 
        // because we want Network First for navigation.
        // CURRENTLY: This will fail because the code does Cache First.
        expect(globalAny.fetch).toHaveBeenCalledWith(request);
        const body = await response.text();
        expect(body).toBe('New UI');
    });
});
