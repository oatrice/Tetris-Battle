/**
 * OnlineGame - Manages the Local Player's game state and syncs with Server
 */
import { Game } from './Game'
import { socketService } from '~/services/SocketService'

export class OnlineGame extends Game {
    isOpponentConnected = false
    opponentBoard: number[][] = [] // Visual representation of opponent grid
    opponentScore = 0
    opponentLines = 0
    opponentId: string | null = null

    constructor() {
        super()
        this.initSocket()
        this.opponentBoard = Array(20).fill(null).map(() => Array(10).fill(0))
    }

    private initSocket() {
        socketService.connect().then(() => {
            console.log('OnlineGame connected to socket')
            socketService.send('join_game')
        }).catch(err => {
            console.error('OnlineGame connection failed', err)
        })

        socketService.on('game_start', (payload: any) => {
            console.log('Game Started vs', payload.opponentId)
            this.opponentId = payload.opponentId
            this.isOpponentConnected = true
            this.reset()
            this.start()
        })

        socketService.on('game_state', (payload: any) => {
            if (payload.grid) this.opponentBoard = payload.grid
            if (payload.score !== undefined) this.opponentScore = payload.score
            if (payload.lines !== undefined) this.opponentLines = payload.lines
        })

        socketService.on('attack', (payload: any) => {
            if (payload.lines) {
                console.log('Received attack:', payload.lines)
                this.receiveGarbage(payload.lines)
            }
        })

        socketService.on('player_left', () => {
            alert('Opponent disconnected!')
            this.isOpponentConnected = false
            this.isGameOver = true
        })

        socketService.on('waiting_for_opponent', () => {
            console.log('Waiting for opponent...')
        })
    }

    // Override lockPiece to capture when a piece is placed and broadcast state
    protected override lockPiece() {
        const linesBefore = this.linesCleared
        super.lockPiece()

        // Broadcast State
        this.broadcastState()

        // Check for Attack
        const linesDiff = this.linesCleared - linesBefore
        if (linesDiff >= 2) {
            const garbage = this.calculateGarbage(linesDiff)
            if (garbage > 0) {
                socketService.send('attack', { lines: garbage })
            }
        }
    }

    // Send State
    broadcastState() {
        if (!this.isOpponentConnected) return

        socketService.send('game_state', {
            grid: this.board.grid,
            score: this.score,
            lines: this.linesCleared
        })

        if (this.isGameOver) {
            socketService.send('game_over')
        }
    }

    private calculateGarbage(lines: number): number {
        switch (lines) {
            case 2: return 1
            case 3: return 2
            case 4: return 4
            default: return 0
        }
    }

    receiveGarbage(count: number) {
        for (let i = 0; i < count; i++) {
            this.addGarbageLine()
        }
        this.broadcastState()
    }

    private addGarbageLine() {
        const width = this.board.width
        const height = this.board.height

        // Shift up
        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width; x++) {
                this.board.grid[y][x] = this.board.grid[y + 1][x]
            }
        }

        // Add bottom garbage
        const hole = Math.floor(Math.random() * width)
        for (let x = 0; x < width; x++) {
            this.board.grid[height - 1][x] = (x === hole) ? 0 : 8 // 8 = garbage
        }
    }

    getOpponentBoard(): number[][] {
        return this.opponentBoard
    }

    getOpponentScore(): number {
        return this.opponentScore
    }

    cleanup() {
        socketService.disconnect()
    }

    // Helper to start game manually if needed or reset
    reset() {
        this.board.clear()
        this.score = 0
        this.linesCleared = 0
        this.level = 1
        this.isGameOver = false
        this.currentPiece = this.spawnPiece()
        this.nextPiece = this.spawnPiece()
    }

    start() {
        this.isPaused = false
    }
}
