<template>
  <div class="online-area" 
       @touchstart="handleTouchStart" 
       @touchmove="handleTouchMove" 
       @touchend="handleTouchEnd">
    <!-- Name Input Overlay -->
    <div v-if="showNameInput" class="name-overlay">
        <div class="name-box">
            <h2>Enter Your Name</h2>
            <input v-model="playerName" @keyup.enter="joinGame" placeholder="Display Name..." maxlength="10" />
            <div class="btn-group">
                <button @click="joinGame" class="join-btn" :disabled="!playerName">Join Game</button>
                <button @click="emit('back')" class="cancel-btn">Cancel</button>
            </div>
        </div>
    </div>

    <!-- Local Player (You) -->
    <div class="player-section">
      <div class="player-header p1">
        <span class="player-label">{{ playerName || 'YOU' }}</span>
        <span class="controls-hint">WASD + Q/E or Arrows</span>
      </div>
      
      <div class="board-wrapper" style="position: relative;">
          <PlayerBoard 
            :game="onlineGame" 
            :showHold="true" 
            :showNext="true"
            playerColor="#00d4ff"
          />
          
          <!-- Waiting / Countdown / Pause Overlay -->
          <div v-if="isWaiting || (onlineGame.countdown !== null) || onlineGame.isPaused" class="board-overlay">
             <div v-if="isWaiting" class="overlay-content">
                 <div class="spinner"></div>
                 <p>Waiting...</p>
             </div>
             <div v-if="onlineGame.countdown !== null" class="overlay-content">
                 <span class="countdown-number">{{ onlineGame.countdown === 0 ? 'GO!' : onlineGame.countdown }}</span>
             </div>
             <div v-if="onlineGame.isPaused" class="overlay-content">
                 <span class="paused-text">GAME PAUSED</span>
                 <span class="sub-text">Press 'P' or Button to Resume</span>
             </div>
          </div>
      </div>

      <div class="player-stats">
        <span class="score">{{ onlineGame.score }}</span>
        <span>L{{ onlineGame.level }} • {{ onlineGame.linesCleared }}</span>
      </div>
    </div>

    <!-- Center Status -->
    <div class="vs-section">
      <span class="vs-text">{{ mode === 'lan' ? '📡 LAN' : '🌐 ONLINE' }}</span>
      <span v-if="onlineGame.isOpponentConnected && !isWaiting && onlineGame.countdown === null" class="game-timer">⏱ {{ formattedTime }}</span>
      
      <div v-if="isWaiting" class="status-box waiting">
          <div class="spinner"></div>
          <span>Waiting for Opponent...</span>
      </div>
      <div v-else-if="onlineGame.isOpponentConnected" class="status-box connected">
          <span>🟢 Connected</span>
      </div>
      
      <div v-if="onlineGame.isGameOver || onlineGame.isWinner || onlineGame.isDraw" class="game-over-box">
          <span v-if="onlineGame.isDraw" class="result-text draw">🤝 DRAW!</span>
          <span v-else-if="onlineGame.isWinner" class="result-text win">🏆 YOU WIN!</span>
          <span v-else class="result-text lose">GAME OVER</span>
          
          <div v-if="onlineGame.isWinner && onlineGame.winScore !== null" class="win-score">
              Win Score: {{ onlineGame.winScore }}
          </div>
          <div v-if="onlineGame.isWinner && !onlineGame.isPaused" class="max-score">
              Max Score: {{ onlineGame.score }}
          </div>
          
          <div v-if="matchSaved" class="save-status">✅ Match Saved!</div>
          
          <div class="button-row">
              <button v-if="onlineGame.isWinner && onlineGame.isPaused" @click="onlineGame.continueAfterWin()" class="continue-btn">
                  ▶️ Continue Playing
              </button>
              <button v-if="!matchSaved" @click="saveAndExit" class="save-btn">💾 Save & Exit</button>
              <button v-else @click="emit('back')" class="back-btn">Exit</button>
          </div>
      </div>

     <button v-if="!onlineGame.isGameOver && !onlineGame.isWinner && !onlineGame.isDraw && !showNameInput" @click="onlineGame.togglePause()" class="back-btn small">
        {{ onlineGame.isPaused ? 'Resume' : 'Pause' }}
     </button>
     
     <button v-if="!onlineGame.isGameOver && !onlineGame.isWinner && !onlineGame.isDraw && !showNameInput" @click="emit('back')" class="back-btn small">Quit</button>
    </div>

    <!-- Remote Player (Opponent) -->
    <div class="player-section opponent-section">
      <div class="player-header p2">
        <span class="player-label">{{ onlineGame.opponentName || 'OPPONENT' }}</span>
         <div class="opponent-score">{{ onlineGame.getOpponentScore() }}</div>
      </div>
      
      <div class="board-container">
          <canvas ref="opponentCanvas" :width="canvasWidth" :height="canvasHeight" class="game-canvas opponent"></canvas>
      </div>

      <div class="player-stats">
         <!-- We could show opponent lines if we synced them -->
         <span>Score: {{ onlineGame.getOpponentScore() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent, computed } from 'vue'
import { OnlineGame } from '~/game/OnlineGame'
import { COLORS } from '~/game/shapes'
import { useTouchControls } from '~/composables/useTouchControls'
import { LeaderboardService } from '~/services/LeaderboardService'

const PlayerBoard = defineAsyncComponent(() => import('./PlayerBoard.vue'))

const props = defineProps<{
  onlineGame: OnlineGame
  mode?: 'online' | 'lan'
}>()

const emit = defineEmits(['back'])

// Name Input State
const showNameInput = ref(true)
const playerName = ref('')
const matchSaved = ref(false)

// Computed state for waiting for opponent
const isWaiting = computed(() => !showNameInput.value && !props.onlineGame.isOpponentConnected)

// Formatted Timer
const formattedTime = computed(() => {
    const totalSeconds = props.onlineGame.gameDuration || 0
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
})

const saveAndExit = () => {
    LeaderboardService.addOnlineMatch({
        date: new Date().toISOString(),
        gameMode: props.mode || 'online',
        isWinner: props.onlineGame.isWinner,
        playerName: playerName.value || 'Player',
        opponentName: props.onlineGame.opponentName || 'Opponent',
        winScore: props.onlineGame.winScore,
        maxScore: props.onlineGame.score,
        opponentScore: props.onlineGame.opponentScore,
        duration: props.onlineGame.gameDuration,
        matchId: props.onlineGame.matchId || undefined
    })
    matchSaved.value = true
}

const joinGame = () => {
    if (!playerName.value.trim()) return
    props.onlineGame.joinGame(playerName.value.trim())
    showNameInput.value = false
}

// ============ Mobile Touch Controls (using composable) ============
const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchControls(
    () => props.onlineGame,
    {
        checkPause: true,
        checkCountdown: () => props.onlineGame.countdown !== null,
        checkOpponentConnected: () => props.onlineGame.isOpponentConnected
    }
)

const CELL_SIZE = 24
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const opponentCanvas = ref<HTMLCanvasElement | null>(null)
let frameId: number | null = null

// Render Loop for Opponent Board
const render = () => {
    if (opponentCanvas.value) {
        renderOpponentBoard(opponentCanvas.value)
    }
    frameId = requestAnimationFrame(render)
}

const renderOpponentBoard = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Opponent Grid Only
    drawBoard(ctx, props.onlineGame.getOpponentBoard())
}

const drawBoard = (ctx: CanvasRenderingContext2D, grid: number[][]) => {
    // Clear
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Grid Lines
    ctx.strokeStyle = '#1a1a3a'
    ctx.lineWidth = 1
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, canvasHeight); ctx.stroke();
    }
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(canvasWidth, y * CELL_SIZE); ctx.stroke();
    }

    // Draw Grid Blocks
    const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            const row = grid[y]
            if (row) {
                const cell = row[x]
                if (cell !== undefined && cell > 0) {
                     const color = cell === 8 ? '#666' : (COLORS[pieceTypes[cell - 1]!] ?? '#888')
                     drawBlock(ctx, x, y, color)
                }
            }
        }
    }
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const p = 1
  ctx.fillStyle = color
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, CELL_SIZE - p * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, 3)
}

onMounted(() => {
    frameId = requestAnimationFrame(render)
    // Check local storage for name
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('tetris-username')
        if (saved) playerName.value = saved
    }
})

onUnmounted(() => {
    if (frameId) cancelAnimationFrame(frameId)
    // Save name
    if (playerName.value) localStorage.setItem('tetris-username', playerName.value)
    
    props.onlineGame.cleanup()
})
</script>

<style scoped>
.online-area {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 2rem;
  padding: 1rem;
  position: relative;
}

.name-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 5rem;
    z-index: 100;
    border-radius: 12px;
}

.name-box {
    background: #1a1a2e;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #444;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    box-shadow: 0 0 30px rgba(0,0,0,0.8);
}

.name-box input {
    padding: 0.8rem;
    border-radius: 6px;
    border: 1px solid #555;
    background: #0f0c29;
    color: white;
    font-size: 1.2rem;
    text-align: center;
}

.btn-group {
    display: flex;
    gap: 1rem;
}

.join-btn {
    background: #00ff88;
    color: #004400;
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
}

.join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.cancel-btn {
    background: transparent;
    border: 1px solid #666;
    color: #aaa;
    padding: 0.8rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
}

.player-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.player-label {
  font-size: 1.2rem;
  font-weight: bold;
}

.p1 .player-label { color: #00d4ff; }
.p2 .player-label { color: #ff6b6b; }

.game-canvas.opponent {
    opacity: 0.8;
    border: 2px solid #555;
    border-radius: 4px;
}

.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 5rem;
  min-width: 150px;
}

.vs-text {
  font-size: 2rem;
  font-weight: 900;
  color: #00ff88;
  font-style: italic;
  text-shadow: 0 0 10px rgba(0,255,136,0.3);
}

.status-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0,0,0,0.5);
    border-radius: 8px;
    width: 100%;
}

.waiting { color: #ffd700; }
.connected { color: #00ff88; }

.spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #ffd700;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.back-btn {
  background: transparent;
  border: 1px solid #666;
  color: #aaa;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.game-timer {
  font-family: monospace;
  font-size: 1.2rem;
  color: #fff;
  background: rgba(0,0,0,0.5);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  margin-top: 0.5rem;
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
  font-family: monospace;
  color: #aaa;
}

.score {
  font-size: 1.5rem;
  color: #ffd700;
  font-weight: bold;
}

.game-over-box {
    font-weight: bold;
    font-size: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
}

.result-text {
    font-size: 2rem;
    font-weight: bold;
    text-shadow: 0 0 20px currentColor;
}

.result-text.win {
    color: #ffd700;
    animation: pulse 0.5s ease-in-out infinite alternate;
}

.result-text.lose {
    color: #ff6b6b;
}

.result-text.draw {
    color: #00d4ff;
    animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
    from { transform: scale(1); }
    to { transform: scale(1.05); }
}

.win-score {
    font-size: 1.2rem;
    color: #ffd700;
    margin: 0.3rem 0;
}

.max-score {
    font-size: 1rem;
    color: #00ff88;
    margin: 0.3rem 0;
}

.save-status {
    font-size: 0.9rem;
    color: #00ff88;
    margin: 0.5rem 0;
}

.save-btn {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    color: #4a3000;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
}

.save-btn:hover {
    transform: scale(1.02);
}

.button-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
}

.continue-btn {
    background: linear-gradient(135deg, #00ff88, #00cc6a);
    color: #004400;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.9rem;
}

.continue-btn:hover {
    transform: scale(1.02);
}

.board-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10;
    border-radius: 4px; /* match board radius if any */
}

.overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: white;
    font-weight: bold;
}

.countdown-number {
    font-size: 5rem;
    color: #ffd700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
    animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.paused-text {
    font-size: 3rem;
    color: #00d4ff;
    font-weight: bold;
    letter-spacing: 2px;
}

.sub-text {
    font-size: 1rem;
    color: #aaa;
}

@keyframes pop {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}
</style>
