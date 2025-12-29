import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Your web app's Firebase configuration
// For safety, these should be in .env (e.g. NUXT_PUBLIC_FIREBASE_API_KEY)
const firebaseConfig = {
    apiKey: import.meta.env.NUXT_PUBLIC_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.NUXT_PUBLIC_FIREBASE_APP_ID as string
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
