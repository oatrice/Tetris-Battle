/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { execSync } from 'child_process';

const getGitInfo = () => {
    try {
        const dirty = execSync('git status --porcelain').toString().trim().length > 0;
        if (dirty) {
            return {
                hash: 'now',
                date: new Date().toISOString()
            };
        }

        const hash = execSync('git rev-parse --short HEAD').toString().trim();
        const date = execSync('git log -1 --format=%cI').toString().trim();
        return { hash, date };
    } catch (e) {
        return {
            hash: 'unknown',
            date: new Date().toISOString()
        };
    }
};

const gitInfo = getGitInfo();

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
        __COMMIT_DATE__: JSON.stringify(gitInfo.date),
        __COMMIT_HASH__: JSON.stringify(gitInfo.hash),
    }
})
