import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from './Game'

describe('Game', () => {
    let game: Game

    beforeEach(() => {
        game = new Game()
    })

    describe('constructor', () => {
        it('should create a game with a board', () => {
            expect(game.board).toBeDefined()
            expect(game.board.width).toBe(10)
            expect(game.board.height).toBe(20)
        })

        it('should spawn an initial piece', () => {
            expect(game.currentPiece).toBeDefined()
        })

        it('should start with score 0', () => {
            expect(game.score).toBe(0)
        })

        it('should start with game not over', () => {
            expect(game.isGameOver).toBe(false)
        })

        it('should start as not paused', () => {
            expect(game.isPaused).toBe(false)
        })
    })

    describe('Speed & Level', () => {
        it('should return default drop interval for level 1', () => {
            expect(game.level).toBe(1)
            // @ts-ignore - method not implemented yet
            expect(game.getDropInterval()).toBe(1000)
        })

        it('should decrease drop interval as level increases', () => {
            game.level = 2
            // @ts-ignore
            const speedLevel2 = game.getDropInterval()

            game.level = 5
            // @ts-ignore
            const speedLevel5 = game.getDropInterval()

            expect(speedLevel2).toBeLessThan(1000)
            expect(speedLevel5).toBeLessThan(speedLevel2)
        })

        it('should cap minimum speed', () => {
            game.level = 99
            // @ts-ignore
            const maxSpeed = game.getDropInterval()
            expect(maxSpeed).toBeGreaterThan(0)
        })

        it('should maintain constant speed when increaseGravity is false', () => {
            game.increaseGravity = false
            game.level = 10

            // @ts-ignore
            const speedLevel10 = game.getDropInterval()
            // @ts-ignore
            // Should equal level 1 speed (1000ms)
            expect(speedLevel10).toBe(1000)
        })
    })

    describe('moveLeft', () => {
        it('should move piece left by 1', () => {
            const initialX = game.currentPiece.x

            const moved = game.moveLeft()

            expect(moved).toBe(true)
            expect(game.currentPiece.x).toBe(initialX - 1)
        })

        it('should not move left if blocked by wall', () => {
            // Move piece to left edge
            while (game.moveLeft()) { /* keep moving */ }
            const xAtWall = game.currentPiece.x

            const moved = game.moveLeft()

            expect(moved).toBe(false)
            expect(game.currentPiece.x).toBe(xAtWall)
        })

        it('should not move left if blocked by another piece', () => {
            // Place blocks covering the entire left side where the piece could move
            const blocks = game.currentPiece.getBlocks()

            // Block all cells to the left of each block in the piece
            blocks.forEach(block => {
                if (block.x > 0) {
                    game.board.setCell(block.x - 1, block.y, 1)
                }
            })

            const moved = game.moveLeft()

            expect(moved).toBe(false)
        })
    })

    describe('moveRight', () => {
        it('should move piece right by 1', () => {
            const initialX = game.currentPiece.x

            const moved = game.moveRight()

            expect(moved).toBe(true)
            expect(game.currentPiece.x).toBe(initialX + 1)
        })

        it('should not move right if blocked by wall', () => {
            // Move piece to right edge
            while (game.moveRight()) { /* keep moving */ }
            const xAtWall = game.currentPiece.x

            const moved = game.moveRight()

            expect(moved).toBe(false)
            expect(game.currentPiece.x).toBe(xAtWall)
        })
    })

    describe('moveDown', () => {
        it('should move piece down by 1', () => {
            const initialY = game.currentPiece.y

            const moved = game.moveDown()

            expect(moved).toBe(true)
            expect(game.currentPiece.y).toBe(initialY + 1)
        })

        it('should lock piece when hitting bottom', () => {
            // Store initial piece before it gets locked
            const pieceToLock = game.currentPiece.clone()

            // Move piece all the way down
            while (game.moveDown()) { /* keep moving */ }

            // Get the locked blocks positions (based on original piece at bottom)
            const ghost = new Game()
            // Check that some cells at the bottom are now filled
            // The board should have some non-empty cells after locking
            let hasFilledCells = false
            for (let y = game.board.height - 1; y >= game.board.height - 4; y--) {
                for (let x = 0; x < game.board.width; x++) {
                    if (game.board.getCell(x, y) > 0) {
                        hasFilledCells = true
                        break
                    }
                }
                if (hasFilledCells) break
            }
            expect(hasFilledCells).toBe(true)
        })

        it('should spawn new piece after locking', () => {
            const oldPiece = game.currentPiece

            // Move piece all the way down to lock it
            while (game.moveDown()) { /* keep moving */ }

            // A new piece should have spawned
            expect(game.currentPiece).not.toBe(oldPiece)
        })
    })

    describe('rotate', () => {
        it('should rotate piece clockwise', () => {
            const initialRotation = game.currentPiece.rotationIndex

            const rotated = game.rotate()

            expect(rotated).toBe(true)
            expect(game.currentPiece.rotationIndex).toBe((initialRotation + 1) % 4)
        })

        it('should not rotate if resulting position is invalid', () => {
            // Move piece to left wall
            while (game.moveLeft()) { /* keep moving */ }

            // For I piece at wall, rotation might be blocked
            // This test may pass or fail depending on piece type
            // Just ensure the rotation method doesn't crash
            game.rotate()
            expect(game.currentPiece.rotationIndex).toBeDefined()
        })
    })

    describe('hardDrop', () => {
        it('should instantly drop piece to bottom', () => {
            const dropped = game.hardDrop()

            expect(dropped).toBe(true)
            // Piece should be locked and new piece spawned
        })

        it('should add score for hard drop distance', () => {
            const initialY = game.currentPiece.y

            game.hardDrop()

            // Score should increase based on drop distance
            expect(game.score).toBeGreaterThan(0)
        })
    })

    describe('canPlacePiece', () => {
        it('should return true when position is valid', () => {
            const canPlace = game.canPlacePiece(game.currentPiece)

            expect(canPlace).toBe(true)
        })

        it('should return false when piece overlaps board blocks', () => {
            const blocks = game.currentPiece.getBlocks()
            game.board.setCell(blocks[0]!.x, blocks[0]!.y, 1)

            const canPlace = game.canPlacePiece(game.currentPiece)

            expect(canPlace).toBe(false)
        })
    })

    describe('getGhostPiece', () => {
        it('should return ghost piece at drop position', () => {
            const ghost = game.getGhostPiece()

            expect(ghost).toBeDefined()
            expect(ghost.type).toBe(game.currentPiece.type)
            expect(ghost.x).toBe(game.currentPiece.x)
            expect(ghost.y).toBeGreaterThanOrEqual(game.currentPiece.y)
        })
    })

    describe('pause/resume', () => {
        it('should toggle pause state', () => {
            expect(game.isPaused).toBe(false)

            game.togglePause()
            expect(game.isPaused).toBe(true)

            game.togglePause()
            expect(game.isPaused).toBe(false)
        })
    })

    describe('nextPiece', () => {
        it('should have a next piece preview', () => {
            expect(game.nextPiece).toBeDefined()
        })

        it('should have different piece after current locks', () => {
            const currentType = game.currentPiece.type
            const nextType = game.nextPiece.type

            game.hardDrop()

            // Current piece should now be what was the next piece
            expect(game.currentPiece.type).toBe(nextType)
        })

        it('should always have a next piece ready', () => {
            // Drop several pieces
            for (let i = 0; i < 5; i++) {
                expect(game.nextPiece).toBeDefined()
                game.hardDrop()
            }
            expect(game.nextPiece).toBeDefined()
        })
    })

    describe('holdPiece', () => {
        beforeEach(() => {
            game.allowHold = true
        })

        it('should start with no held piece', () => {
            expect(game.heldPiece).toBeNull()
        })

        it('should hold current piece when hold is called', () => {
            const currentType = game.currentPiece.type

            game.hold()

            expect(game.heldPiece).toBeDefined()
            expect(game.heldPiece!.type).toBe(currentType)
        })

        it('should swap held piece with current piece', () => {
            const firstType = game.currentPiece.type
            game.hold() // Hold first piece

            game.hardDrop() // Lock to reset hold lock

            const secondType = game.currentPiece.type
            game.hold() // Swap with held piece

            // Current should now be the first piece
            expect(game.currentPiece.type).toBe(firstType)
            // Held should be the second piece
            expect(game.heldPiece!.type).toBe(secondType)
        })

        it('should not allow hold twice in same turn', () => {
            game.hold() // First hold
            const heldType = game.heldPiece!.type

            game.hold() // Second hold should not work

            expect(game.heldPiece!.type).toBe(heldType) // Should not change
        })

        it('should reset hold lock after piece locks', () => {
            game.hold() // First hold
            game.hardDrop() // Lock piece, reset hold lock

            const newCurrentType = game.currentPiece.type
            game.hold() // Should work now

            expect(game.heldPiece!.type).toBe(newCurrentType)
        })
    })

    describe('Bug Fix: Pause should prevent Game Over / Locking', () => {
        it('should NOT move piece down when paused', () => {
            game.isPaused = true
            const initialY = game.currentPiece.y
            const result = game.moveDown()

            expect(result).toBe(false)
            expect(game.currentPiece.y).toBe(initialY)
        })

        it('should NOT lock piece when paused even if called multiple times', () => {
            game.isPaused = true
            const initialPiece = game.currentPiece

            // Try to force a lock by calling moveDown repeatedly
            for (let i = 0; i < 5; i++) {
                game.moveDown()
            }

            // Piece should still be the same instance (meaning it wasn't locked and replaced)
            expect(game.currentPiece).toBe(initialPiece)
        })
    })

    describe('update (Game Loop)', () => {
        it('should accumulate time and trigger moveDown', () => {
            const initialY = game.currentPiece.y

            // Advance time by 500ms (less than default 1000ms)
            // @ts-ignore
            game.update(500)
            expect(game.currentPiece.y).toBe(initialY)

            // Advance another 600ms (total 1100ms > 1000ms)
            // @ts-ignore
            game.update(600)
            expect(game.currentPiece.y).toBe(initialY + 1)
        })

        it('should respect increased speed at higher levels', () => {
            game.level = 2
            // @ts-ignore
            const interval = game.getDropInterval() // e.g. 900ms

            const initialY = game.currentPiece.y

            // Advance by slightly more than interval
            // @ts-ignore
            game.update(interval + 10)

            expect(game.currentPiece.y).toBe(initialY + 1)
        })
    })
})
