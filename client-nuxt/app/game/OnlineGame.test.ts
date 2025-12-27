/**
 * OnlineGame Test - Tests for game_over event handling
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock socketService before importing OnlineGame
const mockListeners = new Map<string, Function[]>()

vi.mock('~/services/SocketService', () => ({
    socketService: {
        connect: vi.fn().mockResolvedValue(undefined),
        on: (event: string, handler: Function) => {
            if (!mockListeners.has(event)) {
                mockListeners.set(event, [])
            }
            mockListeners.get(event)!.push(handler)
        },
        send: vi.fn(),
        disconnect: vi.fn()
    }
}))

// Import after mock
import { OnlineGame } from './OnlineGame'
import { EffectType } from './EffectSystem'

// Helper to trigger mock events
const triggerEvent = (event: string, payload?: any) => {
    const handlers = mockListeners.get(event) || []
    handlers.forEach(h => h(payload))
}

describe('OnlineGame game_over handling', () => {
    let game: OnlineGame

    beforeEach(() => {
        mockListeners.clear()
        game = new OnlineGame()
        game.init('ws://localhost:8080/ws')
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('Host/Guest Role', () => {
        it('should default to being guest (isHost = false)', () => {
            expect(game.isHost).toBe(false)
        })

        it('should become guest when room_status indicates host exists', () => {
            triggerEvent('room_status', {
                hasHost: true,
                hostSettings: {
                    attackMode: 'lines',
                    showGhostPiece: false
                }
            })

            expect(game.isHost).toBe(false)
            expect(game.attackMode).toBe('lines')
            expect(game.showGhostPiece).toBe(false)
        })

        it('should remain host when room_status has no host', () => {
            triggerEvent('room_status', {
                hasHost: false
            })

            expect(game.isHost).toBe(true)
        })

        it('should confirm host role when receiving waiting_for_opponent', () => {
            game.isHost = false // Reset to test

            triggerEvent('waiting_for_opponent')

            expect(game.isHost).toBe(true)
        })
    })

    describe('receiving game_start event', () => {
        it('should extraction matchId from payload', () => {
            triggerEvent('game_start', {
                opponentId: 'op1',
                opponentName: 'Opponent',
                matchId: 'room-12345'
            })
            expect(game.matchId).toBe('room-12345')
            expect(game.opponentId).toBe('op1')
        })

        it('should sync attackMode from server payload', () => {
            // Player set local attackMode to 'lines'
            game.attackMode = 'lines'

            // Server responds with synced attackMode (from host)
            triggerEvent('game_start', {
                opponentId: 'op1',
                opponentName: 'Opponent',
                matchId: 'room-12345',
                attackMode: 'garbage' // Server overrides with host's setting
            })

            // Local attackMode should be synced to server's value
            expect(game.attackMode).toBe('garbage')
        })

        it('should keep local attackMode if server does not provide one', () => {
            game.attackMode = 'lines'

            triggerEvent('game_start', {
                opponentId: 'op1',
                opponentName: 'Opponent',
                matchId: 'room-12345'
                // No attackMode in payload (backwards compatibility)
            })

            expect(game.attackMode).toBe('lines')
        })
    })

    describe('receiving game_over event', () => {
        it('should set isWinner=true when opponent loses (and self not game over)', () => {
            // Precondition: self is still playing
            expect(game.isGameOver).toBe(false)

            // Opponent loses
            triggerEvent('game_over')

            expect(game.isWinner).toBe(true)
            expect(game.opponentGameOver).toBe(true)
            expect(game.isDraw).toBe(false)
            expect(game.isPaused).toBe(true)
            expect(game.winScore).toBe(game.score)
        })

        it('should set isDraw=true when both players game over simultaneously', () => {
            // Precondition: self already game over
            game.isGameOver = true

            // Then receive opponent game_over
            triggerEvent('game_over')

            expect(game.isDraw).toBe(true)
            expect(game.isWinner).toBe(false)
            expect(game.opponentGameOver).toBe(true)
        })

        it('should not process game_over twice (guard check)', () => {
            // First game_over
            triggerEvent('game_over')
            expect(game.isWinner).toBe(true)

            // Attempt second game_over
            game.score = 9999 // Change score to verify it doesn't update
            triggerEvent('game_over')

            // winScore should still be original (0), not 9999
            expect(game.winScore).toBe(0)
        })

        it('should not set isWinner if already isDraw', () => {
            // Set up draw state
            game.isDraw = true

            triggerEvent('game_over')

            expect(game.isWinner).toBe(false) // Should remain false
        })

        it('should record winScore at moment of winning', () => {
            // Set up a score before winning
            game.score = 5000

            triggerEvent('game_over')

            expect(game.winScore).toBe(5000)
        })
    })

    describe('Attack Mode Logic', () => {
        it('should default to garbage mode', () => {
            expect(game.attackMode).toBe('garbage')
        })

        it('should allow changing attack mode', () => {
            game.attackMode = 'lines'
            expect(game.attackMode).toBe('lines')
        })
    })

    describe('Ghost Piece Toggle', () => {
        it('should show ghost piece by default', () => {
            expect(game.showGhostPiece).toBe(true)
        })

        it('should allow toggling ghost piece visibility', () => {
            game.showGhostPiece = false
            expect(game.showGhostPiece).toBe(false)
        })

        it('should have toggleGhostPiece method', () => {
            expect(typeof game.toggleGhostPiece).toBe('function')
        })

        it('should toggle ghost piece visibility when toggleGhostPiece is called', () => {
            expect(game.showGhostPiece).toBe(true)
            game.toggleGhostPiece()
            expect(game.showGhostPiece).toBe(false)
            game.toggleGhostPiece()
            expect(game.showGhostPiece).toBe(true)
        })
    })

    describe('Effect Type Settings', () => {
        it('should default to explosion effect', () => {
            expect(game.effectType).toBe(EffectType.EXPLOSION)
        })

        it('should allow changing effect type', () => {
            game.effectType = EffectType.SPARKLE
            expect(game.effectType).toBe(EffectType.SPARKLE)
        })

        it('should accept all valid effect types', () => {
            const validTypes = [EffectType.EXPLOSION, EffectType.SPARKLE, EffectType.WAVE, EffectType.SHATTER, EffectType.CLASSIC]
            validTypes.forEach(type => {
                game.effectType = type
                expect(game.effectType).toBe(type)
            })
        })
    })

    describe('Cascade Gravity Settings', () => {
        it('should default to cascade gravity off', () => {
            expect(game.useCascadeGravity).toBe(false)
        })

        it('should allow toggling cascade gravity', () => {
            game.useCascadeGravity = true
            expect(game.useCascadeGravity).toBe(true)
            game.useCascadeGravity = false
            expect(game.useCascadeGravity).toBe(false)
        })

        it('should sync cascade gravity from room_status', () => {
            triggerEvent('room_status', {
                hasHost: true,
                hostSettings: {
                    attackMode: 'garbage',
                    useCascadeGravity: true
                }
            })
            expect(game.useCascadeGravity).toBe(true)
        })
    })
})
