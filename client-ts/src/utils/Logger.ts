
export class Logger {
    private static STORAGE_KEY = 'tetris_debug_logs';
    private static MAX_LOGS = 1000;
    private static STORAGE_ENABLED = false; // Disabled by default to save space

    static log(message: string, data?: any) {
        this.write('INFO', message, data);
    }

    static error(message: string, error?: any) {
        this.write('ERROR', message, error);
    }

    static setStorageEnabled(enabled: boolean) {
        this.STORAGE_ENABLED = enabled;
        console.log(`[Logger] Storage persistence is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    private static write(level: string, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}`;

        // Console output
        if (level === 'ERROR') {
            console.error(logEntry);
        } else {
            console.log(logEntry);
        }

        // Persist to localStorage
        if (this.STORAGE_ENABLED) {
            try {
                const currentLogs = this.getLogs();
                currentLogs.push(logEntry);

                if (currentLogs.length > this.MAX_LOGS) {
                    currentLogs.shift(); // Remove oldest
                }

                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentLogs));
            } catch (e) {
                console.warn('Failed to save log to localStorage', e);
            }
        }
    }

    static getLogs(): string[] {
        try {
            const logs = localStorage.getItem(this.STORAGE_KEY);
            return logs ? JSON.parse(logs) : [];
        } catch {
            return [];
        }
    }

    static clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    static download() {
        const logs = this.getLogs().join('\n');
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tetris-debug-${new Date().toISOString()}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Global expose for console debugging
(window as any).downloadLogs = () => Logger.download();
(window as any).clearLogs = () => Logger.clear();
(window as any).enableLogs = (enable: boolean = true) => Logger.setStorageEnabled(enable);
