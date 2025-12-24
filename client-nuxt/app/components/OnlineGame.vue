<template>
  <div class="online-area">
    <!-- Local Player (You) -->
    <div class="player-section">
      <div class="player-header p1">
        <span class="player-label">YOU</span>
        <span class="controls-hint">WASD + Q/E or Arrows</span>
      </div>
      <PlayerBoard 
        :game="onlineGame" 
        :showHold="true" 
        :showNext="true"
        playerColor="#00d4ff"
      />
      <div class="player-stats">
        <span class="score">{{ onlineGame.score }}</span>
        <span>L{{ onlineGame.level }} • {{ onlineGame.linesCleared }}</span>
      </div>
    </div>

    <!-- Center Status -->
    <div class="vs-section">
      <span class="vs-text">ONLINE</span>
      
      <div v-if="!onlineGame.isOpponentConnected" class="status-box waiting">
          <div class="spinner"></div>
          <span>Waiting for Opponent...</span>
      </div>
      <div v-else class="status-box connected">
          <span>🟢 Connected</span>
          <span class="opponent-id" v-if="onlineGame.opponentId">vs {{ onlineGame.opponentId.slice(-4) }}</span>
      </div>
      
      <div v-if="onlineGame.isGameOver" class="game-over-box">
          <span>GAME OVER</span>
          <button @click="emit('back')" class="back-btn">Exit</button>
      </div>

     <button v-if="!onlineGame.isGameOver" @click="emit('back')" class="back-btn small">Quit</button>
    </div>

    <!-- Remote Player (Opponent) -->
    <div class="player-section opponent-section">
      <div class="player-header p2">
        <span class="player-label">OPPONENT</span>
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
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { OnlineGame } from '~/game/OnlineGame'
import { COLORS } from '~/game/shapes'

const PlayerBoard = defineAsyncComponent(() => import('./PlayerBoard.vue'))

const props = defineProps<{
  onlineGame: OnlineGame
}>()

const emit = defineEmits(['back'])

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
})

onUnmounted(() => {
    if (frameId) cancelAnimationFrame(frameId)
    // Cleanup socket handled by component destruction? 
    // Ideally OnlineGame handles it, but we can double check.
    // props.onlineGame.cleanup() is better called by parent or unmount here?
    // Let's assume parent manages lifecycle or game logic does.
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
    color: #ff6b6b;
    font-weight: bold;
    font-size: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
}
</style>
