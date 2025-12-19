/**
 * RealtimeService.ts
 * Wrapper for Firebase Realtime Database operations.
 * Uses environment variables prefixed with VITE_ (Vite exposes them to client).
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    remove,
    push,
    update,
    DataSnapshot,
} from "firebase/database";

export class RealtimeService {
    private db: ReturnType<typeof getDatabase>;

    constructor() {
        const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

        if (!databaseURL) {
            throw new Error(
                '[RealtimeService] VITE_FIREBASE_DATABASE_URL is not configured. ' +
                'Coop mode requires Firebase Realtime Database. ' +
                'Please add VITE_FIREBASE_DATABASE_URL to your .env file.'
            );
        }

        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY!,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
            databaseURL: databaseURL,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
            appId: import.meta.env.VITE_FIREBASE_APP_ID!,
        };

        const appName = 'realtime-db-app';
        let app;
        if (getApps().some(a => a.name === appName)) {
            app = getApp(appName);
        } else {
            app = initializeApp(firebaseConfig, appName);
        }
        this.db = getDatabase(app);
    }

    /** Set value at a specific path */
    async set(path: string, value: any): Promise<void> {
        await set(ref(this.db, path), value);
    }

    /** Get value at a specific path (one-time read) */
    async get<T>(path: string): Promise<T | null> {
        const snapshot = await get(ref(this.db, path));
        return snapshot.exists() ? (snapshot.val() as T) : null;
    }

    /** Listen for realtime updates */
    onValue<T>(
        path: string,
        callback: (data: T | null) => void
    ): () => void {
        const unsubscribe = onValue(ref(this.db, path), (snapshot: DataSnapshot) => {
            callback(snapshot.exists() ? (snapshot.val() as T) : null);
        });
        return unsubscribe;
    }

    /** Remove data at a path */
    async remove(path: string): Promise<void> {
        await remove(ref(this.db, path));
    }

    /** Push a new child and return its key */
    async push(path: string, value: any): Promise<string | null> {
        const newRef = push(ref(this.db, path));
        await set(newRef, value);
        return newRef.key;
    }

    /** Update multiple fields at once */
    async update(path: string, values: Record<string, any>): Promise<void> {
        await update(ref(this.db, path), values);
    }
}
