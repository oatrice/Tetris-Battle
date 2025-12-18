import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, Auth, User, onAuthStateChanged } from 'firebase/auth';

export class AuthService {
    private app: FirebaseApp;
    private auth: Auth;
    private user: User | null = null;

    constructor() {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        this.app = initializeApp(firebaseConfig);
        this.auth = getAuth(this.app);

        console.log('[AuthService] Initialized with config check:', {
            hasApiKey: !!firebaseConfig.apiKey,
            hasAuthDomain: !!firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId
        });

        onAuthStateChanged(this.auth, (user) => {
            console.log('[AuthService] Auth State Changed:', user ? `User ${user.uid} logged in` : 'Logged out');
            this.user = user;
        });
    }

    async signInWithGoogle(): Promise<User> {
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

    getAuth(): Auth {
        return this.auth;
    }
}
