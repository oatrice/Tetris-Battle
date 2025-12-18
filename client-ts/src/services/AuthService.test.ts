import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './AuthService';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
}));

describe('AuthService', () => {
    let authService: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Simulate onAuthStateChanged calling the callback immediately or storing it
        // For specific tests, we might need to mock implementation of onAuthStateChanged
        authService = new AuthService();
    });

    it('should initialize firebase on creation', () => {
        expect(initializeApp).toHaveBeenCalled();
    });

    it('should sign in with google', async () => {
        const mockUser = { uid: '123', displayName: 'Test User' };
        vi.mocked(signInWithPopup).mockResolvedValue({ user: mockUser } as any);

        const user = await authService.signInWithGoogle();

        expect(getAuth).toHaveBeenCalled();
        expect(GoogleAuthProvider).toHaveBeenCalled();
        expect(signInWithPopup).toHaveBeenCalled();
        expect(user).toEqual(mockUser);
    });

    it('should sign out', async () => {
        await authService.logout();

        expect(signOut).toHaveBeenCalled();
    });
});
