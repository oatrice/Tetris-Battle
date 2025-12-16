export async function registerSW() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('SW registered');

            // Force update check on load
            registration.update();

            // Optional: Listen for updates
            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                console.log('New content available; please refresh.');
                                // Optionally notify user to refresh
                            } else {
                                console.log('Content is cached for offline use.');
                            }
                        }
                    };
                }
            };
        } catch (e) {
            console.error('SW registration failed', e);
        }
    }
}
