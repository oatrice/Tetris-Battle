/// <reference types="vite/client" />

declare module 'virtual:version-info' {
    export const APP_VERSION: string;
    export const COMMIT_HASH: string;
    export const COMMIT_DATE: string;
}
