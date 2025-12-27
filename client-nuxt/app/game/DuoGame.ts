/**
 * DuoGame - Manages 2-player local multiplayer Tetris
 * 
 * Features:
 * - Two independent Game instances
 * - Separate controls for each player
 * - Attack system (garbage lines)
 * - Win condition detection
 */
import { Game } from './Game'

export class DuoGame {
    readonly player1: Game
    readonly player2: Game
    winner: 1 | 2 | null
    isPaused: boolean

    constructor() {
        this.player1 = new Game()
        this.player2 = new Game()
        this.winner = null
        this.isPaused = false
    }

    get increaseGravity(): boolean {
        return this.player1.increaseGravity
    }

    set increaseGravity(value: boolean) {
        this.player1.increaseGravity = value
        this.player2.increaseGravity = value
    }

    // ============ Player 1 Controls ============
    p1MoveLeft(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            this.player1.moveLeft()
        }
    }

    p1MoveRight(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            this.player1.moveRight()
        }
    }

    p1MoveDown(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            this.player1.moveDown()
        }
    }

    p1Rotate(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            this.player1.rotate()
        }
    }

    p1HardDrop(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            const linesBefore = this.player1.linesCleared
            this.player1.hardDrop()
            const linesAfter = this.player1.linesCleared

            // Check for attack
            const linesCleared = linesAfter - linesBefore
            if (linesCleared >= 2) {
                this.sendGarbage(1, linesCleared, this.getGarbageLines(linesCleared))
            }

            this.checkWinCondition()
        }
    }

    p1Hold(): void {
        if (!this.isPaused && !this.player1.isGameOver) {
            this.player1.hold()
        }
    }

    // ============ Player 2 Controls ============
    p2MoveLeft(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            this.player2.moveLeft()
        }
    }

    p2MoveRight(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            this.player2.moveRight()
        }
    }

    p2MoveDown(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            this.player2.moveDown()
        }
    }

    p2Rotate(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            this.player2.rotate()
        }
    }

    p2HardDrop(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            const linesBefore = this.player2.linesCleared
            this.player2.hardDrop()
            const linesAfter = this.player2.linesCleared

            // Check for attack
            const linesCleared = linesAfter - linesBefore
            if (linesCleared >= 2) {
                this.sendGarbage(2, linesCleared, this.getGarbageLines(linesCleared))
            }

            this.checkWinCondition()
        }
    }

    p2Hold(): void {
        if (!this.isPaused && !this.player2.isGameOver) {
            this.player2.hold()
        }
    }

    // ============ Game Loop ============
    update(deltaTime: number): void {
        if (this.isPaused || this.winner !== null) return

        this.player1.update(deltaTime)
        this.player2.update(deltaTime)

        this.checkWinCondition()
    }

    togglePause(): void {
        this.isPaused = !this.isPaused
    }

    // ============ Win Condition ============
    checkWinCondition(): void {
        if (this.winner !== null) return

        if (this.player1.isGameOver && !this.player2.isGameOver) {
            this.winner = 2
        } else if (this.player2.isGameOver && !this.player1.isGameOver) {
            this.winner = 1
        } else if (this.player1.isGameOver && this.player2.isGameOver) {
            // Both game over - whoever has higher score wins
            this.winner = this.player1.score >= this.player2.score ? 1 : 2
        }
    }

    // ============ Attack System ============

    /**
     * Calculate number of garbage lines to send based on lines cleared
     * 2 lines = 1 garbage, 3 lines = 2 garbage, 4 lines (Tetris) = 4 garbage
     */
    private getGarbageLines(linesCleared: number): number {
        switch (linesCleared) {
            case 2: return 1
            case 3: return 2
            case 4: return 4  // Tetris bonus
            default: return 0
        }
    }

    /**
     * Send garbage lines to the opponent
     * @param fromPlayer - Player who cleared lines (1 or 2)
     * @param _linesCleared - Number of lines cleared (for logging/future use)
     * @param garbageCount - Number of garbage lines to send
     */
    sendGarbage(fromPlayer: 1 | 2, _linesCleared: number, garbageCount: number): void {
        if (garbageCount <= 0) return

        const targetPlayer = fromPlayer === 1 ? this.player2 : this.player1

        // Add garbage lines to bottom of target's board
        for (let i = 0; i < garbageCount; i++) {
            this.addGarbageLine(targetPlayer)
        }
    }

    /**
     * Add a single garbage line to the bottom of a player's board
     */
    private addGarbageLine(player: Game): void {
        // Shift all rows up by 1
        for (let y = 0; y < player.board.height - 1; y++) {
            for (let x = 0; x < player.board.width; x++) {
                const cellAbove = player.board.getCell(x, y + 1)
                player.board.setCell(x, y, cellAbove === -1 ? 0 : cellAbove)
            }
        }

        // Add garbage row at bottom (all filled except one random hole)
        const holePosition = Math.floor(Math.random() * player.board.width)
        const bottomRow = player.board.height - 1

        for (let x = 0; x < player.board.width; x++) {
            if (x !== holePosition) {
                player.board.setCell(x, bottomRow, 8) // 8 = garbage color
            } else {
                player.board.setCell(x, bottomRow, 0) // hole
            }
        }
    }
}
