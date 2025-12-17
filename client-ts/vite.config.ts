/// <reference types="vitest" />
import { defineConfig, HmrContext } from 'vite'
import { execSync } from 'child_process';

const getGitInfo = () => {
    try {
        const output = execSync('git status --porcelain').toString().trim();
        const dirty = output.length > 0;
        console.log('[Vite Config] Git Status Check:', { dirty, output });
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
console.log('[Vite Config] Final Git Info:', gitInfo);

const versionPlugin = () => {
    const virtualModuleId = 'virtual:version-info';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;

    return {
        name: 'git-version-plugin',
        resolveId(id: string) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
        },
        load(id: string) {
            if (id === resolvedVirtualModuleId) {
                const info = getGitInfo();
                const pkgVersion = process.env.npm_package_version || '1.0.0';

                return `
export const APP_VERSION = ${JSON.stringify(pkgVersion)};
export const COMMIT_HASH = ${JSON.stringify(info.hash)};
export const COMMIT_DATE = ${JSON.stringify(info.date)};
`;
            }
        },
        // Force reload when any file changes to update dirty status?
        // Actually, just having it as a module means if we depend on it, it might not auto-update unless triggered.
        // But let's try this standard virtual module approach first.
        handleHotUpdate(ctx: HmrContext) {
            // When any file changes (except the virtual module itself which doesn't physically exist),
            // invalidate the virtual module to force re-fetch of git status on next reload.
            const server = ctx.server;
            const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
            if (mod) {
                // Invalidating the module ensures that the next time it is requested (e.g. page reload),
                // it will re-execute the load() hook and get fresh Git info.
                server.moduleGraph.invalidateModule(mod);
            }
        }
    };
};


export default defineConfig({
    plugins: [versionPlugin()],
    server: {
        allowedHosts: ['multimedial-amiyah-opportunistically.ngrok-free.dev'],
    },
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
    },
    // define: { ... } // Removed static define
})
