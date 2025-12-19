/**
 * P2PConnectionUI.ts
 * UI Component for WebRTC P2P Manual Signaling
 * Supports QR Code display and Copy/Paste for offline connection
 */

import { WebRTCSync } from './WebRTCSync';
import { ConnectionState } from './ISyncProvider';

/**
 * UI Controller for P2P Connection establishment
 */
export class P2PConnectionUI {
    private webrtcSync: WebRTCSync;
    private modalElement: HTMLElement | null = null;
    private onConnected?: (webrtcSync: WebRTCSync, playerNumber: 1 | 2) => void;
    private onCancel?: () => void;
    private root: HTMLElement;

    constructor(root: HTMLElement) {
        this.root = root;
        this.webrtcSync = new WebRTCSync();

        // Listen for connection state changes
        this.webrtcSync.onConnectionStateChange = (state: ConnectionState) => {
            this.updateConnectionStatus(state);
            if (state === 'connected' && this.onConnected) {
                this.hideModal();
                // Delay slightly to ensure UI is ready
                setTimeout(() => {
                    this.onConnected?.(this.webrtcSync, this.currentPlayerNumber);
                }, 100);
            }
        };
    }

    private currentPlayerNumber: 1 | 2 = 1;

    /**
     * Show the P2P connection menu
     */
    showConnectionMenu(onConnected: (sync: WebRTCSync, playerNumber: 1 | 2) => void, onCancel?: () => void): void {
        this.onConnected = onConnected;
        this.onCancel = onCancel;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'p2pConnectionModal';
        modal.className = 'p2p-modal';
        modal.innerHTML = `
            <div class="p2p-modal-content">
                <h2>🎮 Offline P2P Connection</h2>
                <p class="p2p-description">เล่นกับเพื่อนผ่าน WiFi โดยไม่ต้องใช้ Internet!</p>
                
                <div class="p2p-options">
                    <button id="p2pHostBtn" class="menu-btn p2p-host-btn">
                        📡 Create Game (Host)
                    </button>
                    <button id="p2pJoinBtn" class="menu-btn p2p-join-btn">
                        📲 Join Game (Guest)
                    </button>
                </div>

                <div id="p2pStatusArea" class="p2p-status-area" style="display: none;">
                    <div id="p2pStatusText" class="p2p-status-text"></div>
                    <div id="p2pConnectionData" class="p2p-connection-data"></div>
                    <div id="p2pInputArea" class="p2p-input-area"></div>
                </div>

                <button id="p2pBackBtn" class="menu-btn p2p-back-btn">← Back</button>
            </div>
        `;

        // Add styles
        this.addStyles();

        // Add event listeners
        modal.querySelector('#p2pHostBtn')?.addEventListener('click', () => this.startAsHost());
        modal.querySelector('#p2pJoinBtn')?.addEventListener('click', () => this.startAsGuest());
        modal.querySelector('#p2pBackBtn')?.addEventListener('click', () => this.handleCancel());

        this.root.appendChild(modal);
        this.modalElement = modal;
    }

    /**
     * Start as Host - Create offer
     */
    private async startAsHost(): Promise<void> {
        this.currentPlayerNumber = 1;
        this.showStatusArea();
        this.updateStatus('กำลังสร้าง Connection...');

        try {
            const offerString = await this.webrtcSync.createOffer();

            // Show offer for copying
            this.showConnectionData(
                '📋 Copy this code และส่งให้เพื่อน:',
                offerString,
                true // Enable copy button
            );

            // Show input for answer
            this.showInputArea(
                '📥 วาง Answer จากเพื่อน:',
                'Paste answer here...',
                async (answer: string) => {
                    try {
                        this.updateStatus('กำลังเชื่อมต่อ...');
                        await this.webrtcSync.acceptAnswer(answer);
                        this.updateStatus('✅ เชื่อมต่อสำเร็จ! กำลังเริ่มเกม...');
                    } catch (error) {
                        this.updateStatus(`❌ Error: ${(error as Error).message}`);
                    }
                }
            );

        } catch (error) {
            this.updateStatus(`❌ Error: ${(error as Error).message}`);
        }
    }

    /**
     * Start as Guest - Accept offer
     */
    private startAsGuest(): void {
        this.currentPlayerNumber = 2;
        this.showStatusArea();

        // Show input for offer
        this.showInputArea(
            '📥 วาง Offer จาก Host:',
            'Paste offer here...',
            async (offer: string) => {
                try {
                    this.updateStatus('กำลังสร้าง Answer...');
                    const answerString = await this.webrtcSync.acceptOffer(offer);

                    // Show answer for copying
                    this.showConnectionData(
                        '📋 Copy Answer นี้ส่งกลับให้ Host:',
                        answerString,
                        true
                    );

                    this.updateStatus('⏳ รอ Host เชื่อมต่อ...');

                } catch (error) {
                    this.updateStatus(`❌ Error: ${(error as Error).message}`);
                }
            }
        );
    }

    private showStatusArea(): void {
        const statusArea = this.modalElement?.querySelector('#p2pStatusArea') as HTMLElement;
        const options = this.modalElement?.querySelector('.p2p-options') as HTMLElement;

        if (statusArea) statusArea.style.display = 'block';
        if (options) options.style.display = 'none';
    }

    private updateStatus(message: string): void {
        const statusText = this.modalElement?.querySelector('#p2pStatusText');
        if (statusText) statusText.textContent = message;
    }

    private updateConnectionStatus(state: ConnectionState): void {
        let statusMessage = '';
        switch (state) {
            case 'connecting':
                statusMessage = '🔄 กำลังเชื่อมต่อ...';
                break;
            case 'connected':
                statusMessage = '✅ เชื่อมต่อสำเร็จ!';
                break;
            case 'disconnected':
                statusMessage = '⚠️ ถูกตัดการเชื่อมต่อ';
                break;
            case 'failed':
                statusMessage = '❌ การเชื่อมต่อล้มเหลว';
                break;
        }
        if (statusMessage) this.updateStatus(statusMessage);
    }

    private showConnectionData(label: string, data: string, enableCopy: boolean): void {
        const container = this.modalElement?.querySelector('#p2pConnectionData');
        if (!container) return;

        container.innerHTML = `
            <label class="p2p-label">${label}</label>
            <div class="p2p-data-box">
                <textarea class="p2p-data-textarea" readonly>${data}</textarea>
                ${enableCopy ? '<button class="p2p-copy-btn">📋 Copy</button>' : ''}
            </div>
        `;

        // Add copy functionality
        if (enableCopy) {
            const copyBtn = container.querySelector('.p2p-copy-btn');
            const textarea = container.querySelector('.p2p-data-textarea') as HTMLTextAreaElement;

            copyBtn?.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(data);
                    (copyBtn as HTMLButtonElement).textContent = '✅ Copied!';
                    setTimeout(() => {
                        (copyBtn as HTMLButtonElement).textContent = '📋 Copy';
                    }, 2000);
                } catch {
                    // Fallback: select text
                    textarea?.select();
                    document.execCommand('copy');
                }
            });
        }
    }

    private showInputArea(label: string, placeholder: string, onSubmit: (value: string) => void): void {
        const container = this.modalElement?.querySelector('#p2pInputArea');
        if (!container) return;

        container.innerHTML = `
            <label class="p2p-label">${label}</label>
            <div class="p2p-input-box">
                <textarea class="p2p-input-textarea" placeholder="${placeholder}"></textarea>
                <button class="p2p-submit-btn">✓ Submit</button>
            </div>
        `;

        const submitBtn = container.querySelector('.p2p-submit-btn');
        const textarea = container.querySelector('.p2p-input-textarea') as HTMLTextAreaElement;

        submitBtn?.addEventListener('click', () => {
            const value = textarea?.value?.trim();
            if (value) {
                onSubmit(value);
            }
        });

        // Also submit on Ctrl+Enter
        textarea?.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const value = textarea?.value?.trim();
                if (value) onSubmit(value);
            }
        });
    }

    private handleCancel(): void {
        this.webrtcSync.stop();
        this.hideModal();
        this.onCancel?.();
    }

    private hideModal(): void {
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
            this.modalElement = null;
        }
    }

    /**
     * Get the WebRTCSync instance
     */
    getSync(): WebRTCSync {
        return this.webrtcSync;
    }

    private addStyles(): void {
        if (document.getElementById('p2p-styles')) return;

        const style = document.createElement('style');
        style.id = 'p2p-styles';
        style.textContent = `
            .p2p-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 3000;
            }

            .p2p-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 2px solid #0f3460;
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            .p2p-modal-content h2 {
                color: #e94560;
                text-align: center;
                margin-bottom: 0.5rem;
                font-size: 1.5rem;
            }

            .p2p-description {
                color: #888;
                text-align: center;
                margin-bottom: 1.5rem;
                font-size: 0.9rem;
            }

            .p2p-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .p2p-host-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            }

            .p2p-join-btn {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%) !important;
            }

            .p2p-back-btn {
                background: linear-gradient(135deg, #434343 0%, #000000 100%) !important;
                margin-top: 1rem;
            }

            .p2p-status-area {
                margin: 1rem 0;
            }

            .p2p-status-text {
                color: #fff;
                text-align: center;
                padding: 0.75rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                margin-bottom: 1rem;
            }

            .p2p-label {
                display: block;
                color: #aaa;
                margin-bottom: 0.5rem;
                font-size: 0.9rem;
            }

            .p2p-data-box, .p2p-input-box {
                margin-bottom: 1rem;
            }

            .p2p-data-textarea, .p2p-input-textarea {
                width: 100%;
                min-height: 80px;
                padding: 0.75rem;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid #333;
                border-radius: 8px;
                color: #0f0;
                font-family: monospace;
                font-size: 0.75rem;
                resize: vertical;
                margin-bottom: 0.5rem;
            }

            .p2p-input-textarea {
                color: #fff;
            }

            .p2p-copy-btn, .p2p-submit-btn {
                padding: 0.5rem 1rem;
                background: #e94560;
                border: none;
                border-radius: 6px;
                color: #fff;
                cursor: pointer;
                font-size: 0.9rem;
                transition: transform 0.2s, background 0.2s;
            }

            .p2p-copy-btn:hover, .p2p-submit-btn:hover {
                transform: scale(1.05);
                background: #ff6b6b;
            }

            .p2p-submit-btn {
                background: #38ef7d;
            }

            .p2p-submit-btn:hover {
                background: #11998e;
            }

            @media (max-width: 500px) {
                .p2p-modal-content {
                    padding: 1rem;
                }

                .p2p-modal-content h2 {
                    font-size: 1.2rem;
                }

                .p2p-data-textarea, .p2p-input-textarea {
                    font-size: 0.65rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
}
