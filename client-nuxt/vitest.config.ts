import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
    plugins: [vue()],
    define: {
        'import.meta.client': true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['app/**/*.test.ts'],
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '@': fileURLToPath(new URL('./app', import.meta.url)),
            'virtual:git-version': fileURLToPath(new URL('./test/mocks/git-version.ts', import.meta.url)),
        },
    },
})
