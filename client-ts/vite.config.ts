/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { execSync } from 'child_process';

export default defineConfig({
    server: {
        allowedHosts: ['multimedial-amiyah-opportunistically.ngrok-free.dev'],
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
    },
    define: {
        __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
        __COMMIT_DATE__: JSON.stringify(execSync('git log -1 --format=%cI').toString().trim()),
        __COMMIT_HASH__: JSON.stringify(execSync('git rev-parse --short HEAD').toString().trim()),
    }
})
