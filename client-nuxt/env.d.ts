/// <reference types="vite/client" />

// Virtual module declarations
declare module 'virtual:git-version' {
    export const COMMIT_HASH: string
    export const COMMIT_DATE: string
    export const IS_DIRTY: boolean
}
