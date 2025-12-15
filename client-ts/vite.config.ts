/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        allowedHosts: ['multimedial-amiyah-opportunistically.ngrok-free.dev'],
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
    },
})
