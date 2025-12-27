type MessageHandler = (payload: any) => void

export class SocketService {
    private socket: WebSocket | null = null
    private listeners: Map<string, MessageHandler[]> = new Map()
    private isConnected = false
    public myId: string | null = null

    constructor() { }

    connect(url: string, timeoutMs: number = 5000): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                resolve()
                return
            }

            this.socket = new WebSocket(url)

            // Timeout logic
            const timer = setTimeout(() => {
                if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
                    this.socket.close() // Cancel the connection attempt
                    reject(new Error(`Connection timed out after ${timeoutMs}ms`))
                }
            }, timeoutMs)

            this.socket.onopen = () => {
                clearTimeout(timer)
                console.log('WS Connected')
                this.isConnected = true
                resolve()
            }

            this.socket.onerror = (err) => {
                clearTimeout(timer)
                console.error('WS Error', err)
                reject(err)
            }

            this.socket.onclose = () => {
                clearTimeout(timer) // Ensure timer is cleared on close (e.g. immediate close)
                console.log('WS Disconnected')
                this.isConnected = false
                this.emit('disconnected', null)
            }

            this.socket.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    this.handleMessage(msg)
                } catch (e) {
                    console.error('Failed to parse WS msg', e)
                }
            }
        })
    }

    private handleMessage(msg: { type: string; payload?: any; senderId?: string }) {
        if (msg.type === 'identity') {
            this.myId = msg.senderId || null
            console.log('My ID:', this.myId)
        }
        this.emit(msg.type, msg.payload)
    }

    send(type: string, payload: any = {}) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('Socket not active, cannot send', type)
            return
        }
        this.socket.send(JSON.stringify({ type, payload }))
    }

    on(type: string, handler: MessageHandler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, [])
        }
        this.listeners.get(type)!.push(handler)
    }

    off(type: string, handler: MessageHandler) {
        const handlers = this.listeners.get(type)
        if (handlers) {
            this.listeners.set(type, handlers.filter(h => h !== handler))
        }
    }

    private emit(type: string, payload: any) {
        const handlers = this.listeners.get(type)
        if (handlers) {
            handlers.forEach(h => h(payload))
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close()
            this.socket = null
        }
    }

    removeAllListeners() {
        this.listeners.clear()
    }
}

export const socketService = new SocketService()
