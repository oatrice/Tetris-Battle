/**
 * RealtimeService.ts
 * Wrapper for Firebase Realtime Database operations.
 * Uses environment variables prefixed with VITE_ (Vite exposes them to client).
 */

import { initializeApp } from "firebase/app";
import {
    getDatabase,
    ref,
    set,
    onValue,
    remove,
    push,
    update,
    DataSnapshot,
} from "firebase/database";

export class RealtimeService {
    private db: ReturnType<typeof getDatabase>;

    constructor() {
        const firebaseConfig = {
            apiKey: process.env.VITE_FIREBASE_API_KEY!,
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
            databaseURL: process.env.VITE_FIREBASE_DATABASE_URL!,
            projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
            storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
            messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
            appId: process.env.VITE_FIREBASE_APP_ID!,
        };

        const app = initializeApp(firebaseConfig);
        this.db = getDatabase(app);
    }

    /** Set value at a specific path */
    async set(path: string, value: any): Promise<void> {
        await set(ref(this.db, path), value);
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
