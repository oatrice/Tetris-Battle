/**
 * Vite Plugin: Git Version Info
 * Re-evaluates git status on every HMR update to detect dirty/clean state
 */
import { execSync } from 'child_process'
import type { HmrContext, Plugin } from 'vite'

interface GitInfo {
    hash: string
    date: string
    isDirty: boolean
}

function getGitInfo(): GitInfo {
    try {
        const output = execSync('git status --porcelain').toString().trim()
        const isDirty = output.length > 0

        if (isDirty) {
            return {
                hash: 'hmr',
                date: new Date().toISOString(),
                isDirty: true
            }
        }

        const hash = execSync('git rev-parse --short HEAD').toString().trim()
        const date = execSync('git log -1 --format=%cI').toString().trim()
        return { hash, date, isDirty: false }
    } catch {
        return {
            hash: 'dev',
            date: new Date().toISOString(),
            isDirty: true
        }
    }
}

export function gitVersionPlugin(): Plugin {
    const virtualModuleId = 'virtual:git-version'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    return {
        name: 'git-version-plugin',

        resolveId(id: string) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },

        load(id: string) {
            if (id === resolvedVirtualModuleId) {
                const info = getGitInfo()
                console.log('[GitVersionPlugin] Loading:', info)

                return `
export const COMMIT_HASH = ${JSON.stringify(info.hash)};
export const COMMIT_DATE = ${JSON.stringify(info.date)};
export const IS_DIRTY = ${JSON.stringify(info.isDirty)};
`
            }
        },

        handleHotUpdate(ctx: HmrContext) {
            // When any file changes, invalidate the virtual module
            // to force re-fetch of git status on next request
            const mod = ctx.server.moduleGraph.getModuleById(resolvedVirtualModuleId)
            if (mod) {
                console.log('[GitVersionPlugin] Invalidating module due to file change')
                ctx.server.moduleGraph.invalidateModule(mod)
            }
        }
    }
}
