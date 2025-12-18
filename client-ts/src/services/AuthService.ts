import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, Auth, User, onAuthStateChanged } from 'firebase/auth';

export class AuthService {
    private app: FirebaseApp | undefined;
    private auth: Auth | undefined;
    private user: User | null = null;
    private _isConfigured: boolean = false;

    constructor(overrides?: any) {
        const env = import.meta.env;
        const startConfig = overrides || {
            apiKey: env.VITE_FIREBASE_API_KEY,
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: env.VITE_FIREBASE_APP_ID
        };

        const firebaseConfig = { ...startConfig };

        // Validate critical config
        const criticalKeys = ['apiKey', 'authDomain', 'projectId'];
        const missingKeys = criticalKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

        if (missingKeys.length > 0) {
            console.warn('[AuthService] Missing critical Firebase config keys:', missingKeys.join(', '));
            console.warn('[AuthService] Running in OFFLINE mode. Google Sign-In will be disabled.');
            this._isConfigured = false;
            return;
        }

        try {
            this.app = initializeApp(firebaseConfig);
            this.auth = getAuth(this.app);
            this._isConfigured = true;

            onAuthStateChanged(this.auth, (user) => {
                console.log('[AuthService] Auth State Changed:', user ? `User ${user.uid} logged in` : 'Logged out');
                this.user = user;
            });
        } catch (error) {
            console.error('[AuthService] Failed to initialize Firebase:', error);
            this._isConfigured = false;
        }

        console.log('[AuthService] Initialized successfully.');
    }

    isConfigured(): boolean {
        return this._isConfigured;
    }

    async signInWithGoogle(): Promise<User> {
        if (!this._isConfigured || !this.auth) {
            throw new Error('AuthService is not configured (Offline Mode).');
        }

        console.log('[AuthService] Starting Google Sign-In...');
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(this.auth, provider);
            console.log('[AuthService] Sign-In Successful:', result.user.uid);
            this.user = result.user;
            return result.user;
        } catch (error: any) {
            console.error('[AuthService] Error signing in with Google:', error);
            console.error('[AuthService] Error Code:', error.code);
            if (error.code === 'auth/configuration-not-found') {
                console.error('[AuthService] Hint: Go to Firebase Console > Authentication > Sign-in method and enable "Google" provider.');
            }
            throw error;
        }
    }

    async logout(): Promise<void> {
        if (!this._isConfigured || !this.auth) return;
        try {
            await signOut(this.auth);
            this.user = null;
        } catch (error) {
            console.error('Error signing out', error);
            throw error;
        }
    }

    getUser(): User | null {
        return this.user;
    }

    getAuth(): Auth | undefined {
        return this.auth;
    }

    getApp(): FirebaseApp | undefined {
        return this.app;
    }
}
