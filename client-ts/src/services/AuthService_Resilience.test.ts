
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from './AuthService';

// We need to mock firebase/app to avoid real initialization errors during this test
// but we want to fail if the AuthService tries to call them with bad config in a way that crashes
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
    FirebaseApp: class { }
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn()
}));

describe('AuthService Resilience', () => {

    // Helper to reset mocks
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('should not crash when environment variables are missing', () => {
        // ARRANGE
        vi.stubEnv('VITE_FIREBASE_API_KEY', '');
        vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '');
        vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '');

        // ACT
        let service: AuthService | undefined;
        let error: any;

        try {
            service = new AuthService();
        } catch (e) {
            error = e;
        }

        // ASSERT
        expect(error).toBeUndefined();
        expect(service).toBeDefined();
        // We expect a property or method to indicate availability
        // This is the "Red" part -> logic doesn't exist yet
        expect(service!.isConfigured()).toBe(false);
    });

    it('should throw specific error or warn when signing in without config', async () => {
        // ARRANGE
        vi.stubEnv('VITE_FIREBASE_API_KEY', '');
        const service = new AuthService();

        // ACT & ASSERT
        await expect(service.signInWithGoogle()).rejects.toThrow(/not configured/i);
    });
});
