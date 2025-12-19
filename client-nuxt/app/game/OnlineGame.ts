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
    opponentName: string | null = null
    opponentGameOver = false  // True when opponent lost
    isWinner = false          // True when we won (opponent game over)
    isDraw = false            // True when both players game over at same time
    winScore: number | null = null  // Score at time of winning (for leaderboard)
    matchId: string | null = null // Server-assigned match ID

    // Countdown Logic
    countdown: number | null = null
    timer: any = null

    // Game Duration Logic
    gameDuration = 0 // Seconds
    private durationInterval: any = null

    // Game Settings
    attackMode: 'lines' | 'garbage' = 'garbage' // Default to garbage

    constructor() {
        super()
        this.opponentBoard = Array(20).fill(null).map(() => Array(10).fill(0))
    }

    // Public init method to be called AFTER reactive() wrapping
    public init(wsUrl: string) {
        this.initSocket(wsUrl)
    }

    private startDurationTimer() {
        if (this.durationInterval) clearInterval(this.durationInterval)
        this.durationInterval = setInterval(() => {
            if (!this.isPaused && !this.isGameOver) {
                this.gameDuration++
            }
        }, 1000)
    }

    private stopDurationTimer() {
        if (this.durationInterval) {
            clearInterval(this.durationInterval)
            this.durationInterval = null
        }
    }

    private initSocket(wsUrl: string) {
        socketService.connect(wsUrl).then(() => {
            console.log('OnlineGame connected to socket:', wsUrl)
        }).catch(err => {
            console.error('OnlineGame connection failed', err)
        })

        socketService.on('game_start', (payload: any) => {
            console.log('Game Started vs', payload.opponentName, 'MatchID:', payload.matchId)
            this.opponentId = payload.opponentId
            this.opponentName = payload.opponentName
            this.matchId = payload.matchId
            this.isOpponentConnected = true
            this.reset()
            this.startCountdown()
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
            this.stopDurationTimer()
            if (this.timer) clearInterval(this.timer)
        })

        socketService.on('waiting_for_opponent', () => {
            console.log('Waiting for opponent...')
        })

        socketService.on('pause', () => {
            if (!this.isPaused) {
                console.log('Opponent paused the game')
                this.isPaused = true
                // Note: We don't stop our timer if opponent pauses, 
                // but usually online games pause for both. 
                // For now, let's assume pause state is global or synchronized?
                // The current togglePause implementation sends 'pause' and sets local isPaused.
            }
        })

        socketService.on('resume', () => {
            if (this.isPaused) {
                console.log('Opponent resumed the game')
                this.isPaused = false
            }
        })

        socketService.on('game_over', () => {
            // Guard: only process once
            if (this.isWinner || this.opponentGameOver || this.isDraw) return

            this.stopDurationTimer()

            this.opponentGameOver = true

            // Check if both game over at same time = Draw
            if (this.isGameOver) {
                console.log('Both players game over! Draw!')
                this.isDraw = true
            } else {
                console.log('Opponent lost! You win!')
                this.isWinner = true
                this.isPaused = true  // Pause to show win message
                this.winScore = this.score  // Record score at win time
            }
        })
    }

    joinGame(name: string) {
        socketService.send('join_game', { name })
    }

    override togglePause() {
        super.togglePause()
        const event = this.isPaused ? 'pause' : 'resume'
        console.log(`Sending ${event} signal`)
        socketService.send(event)
    }

    // Continue playing solo after winning (for high score)
    continueAfterWin() {
        if (this.isWinner) {
            this.isPaused = false
            console.log('Continuing solo play after winning')
            this.startDurationTimer() // Resume timer for max score tracking
        }
    }

    private startCountdown() {
        this.countdown = 3
        this.timer = setInterval(() => {
            if (this.countdown !== null) {
                this.countdown--
                if (this.countdown <= 0) {
                    clearInterval(this.timer)
                    this.countdown = null
                    this.start()
                }
            }
        }, 1000)
    }

    override moveDown() {
        if (this.countdown !== null) return false
        return super.moveDown()
    }

    protected override lockPiece() {
        const linesBefore = this.linesCleared
        super.lockPiece()

        this.broadcastState()

        if (this.isGameOver) {
            this.stopDurationTimer()
        }

        const linesDiff = this.linesCleared - linesBefore
        if (linesDiff >= 2 && this.attackMode === 'garbage') {
            const garbage = this.calculateGarbage(linesDiff)
            if (garbage > 0) {
                socketService.send('attack', { lines: garbage })
            }
        }
    }

    broadcastState() {
        if (!this.isOpponentConnected) return

        socketService.send('game_state', {
            grid: this.board.grid,
            score: this.score,
            lines: this.linesCleared
        })

        if (this.isGameOver) {
            socketService.send('game_over')
            this.stopDurationTimer()
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

        for (let y = 0; y < height - 1; y++) {
            for (let x = 0; x < width; x++) {
                this.board.grid[y][x] = this.board.grid[y + 1][x]
            }
        }

        const hole = Math.floor(Math.random() * width)
        for (let x = 0; x < width; x++) {
            this.board.grid[height - 1][x] = (x === hole) ? 0 : 8
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
        if (this.timer) clearInterval(this.timer)
        this.stopDurationTimer()
    }

    reset() {
        this.board.clear()
        this.score = 0
        this.linesCleared = 0
        this.level = 1
        this.isGameOver = false
        this.gameDuration = 0
        this.stopDurationTimer()
        this.currentPiece = this.spawnPiece()
        this.nextPiece = this.spawnPiece()
    }

    start() {
        this.isPaused = false
        this.startDurationTimer()
    }
}
