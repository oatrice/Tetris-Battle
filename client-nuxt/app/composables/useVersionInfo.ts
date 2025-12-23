/**
 * Version Info Composable
 * Provides version, commit hash, and timestamp
 * Uses virtual:git-version module for dynamic HMR-aware git status
 */
import { COMMIT_HASH, COMMIT_DATE, IS_DIRTY } from 'virtual:git-version'

export interface VersionInfo {
    version: string
    commitHash: string
    commitDate: string
    isDev: boolean
    isDirty: boolean
}

export function useVersionInfo(): VersionInfo {
    const config = useRuntimeConfig()

    // Format date for display
    const formatDate = (isoDate: string): string => {
        try {
            const date = new Date(isoDate)
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return isoDate
        }
    }

    return {
        version: config.public.appVersion as string || '0.0.0',
        commitHash: COMMIT_HASH,
        commitDate: formatDate(COMMIT_DATE),
        isDev: import.meta.dev,
        isDirty: IS_DIRTY
    }
}

