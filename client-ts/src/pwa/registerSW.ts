export async function registerSW() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('SW registered');
        } catch (e) {
            console.error('SW registration failed', e);
        }
    }
}
