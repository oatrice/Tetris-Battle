<template>
  <div class="solo-game">
    <div class="game-layout">
      <!-- Hold -->
      <div class="side-panel">
        <h4>HOLD</h4>
        <div class="piece-preview" :style="{ opacity: game.heldPiece ? 1 : 0.3 }">
          <MiniPiece v-if="game.heldPiece" :piece="game.heldPiece" />
          <span v-else class="empty-hint">C</span>
        </div>
      </div>

      <!-- Board -->
      <div class="board-section">
        <canvas 
          ref="canvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="game-canvas"
          @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
        />
        <div v-if="game.isPaused && !game.isGameOver" class="overlay">⏸️ PAUSED</div>
        <div v-if="game.isGameOver" class="overlay game-over">
          <span>💀 GAME OVER</span>
          <button @click="$emit('restart')">🔄 Restart</button>
        </div>
      </div>

      <!-- Next -->
      <div class="side-panel">
        <h4>NEXT</h4>
        <div class="piece-preview">
          <MiniPiece :piece="game.nextPiece" />
        </div>
        <div class="stats">
          <p class="score">{{ game.score }}</p>
          <p>Level {{ game.level }}</p>
          <p>Lines {{ game.linesCleared }}</p>
          <p v-if="isSpecialMode && 'chainCount' in game && (game as any).chainCount > 0" class="chain">
            🔥 {{ (game as any).chainCount }}-Chain!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineAsyncComponent } from 'vue'
import { Game } from '~/game/Game'
import { COLORS } from '~/game/shapes'
import { InputHandler, GameAction } from '~/game/InputHandler'

const MiniPiece = defineAsyncComponent(() => import('./MiniPiece.vue'))

const props = defineProps<{
  game: Game
  isSpecialMode?: boolean
}>()

defineEmits(['restart'])

const CELL_SIZE = 24
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const canvas = ref<HTMLCanvasElement | null>(null)
const inputHandler = new InputHandler()

// ============ Touch Handlers ============
const handleTouchStart = (event: TouchEvent) => {
  inputHandler.handleTouchStart(event)
}

const handleTouchMove = (event: TouchEvent) => {
  const action = inputHandler.handleTouchMove(event)
  if (action) executeAction(action)
}

const handleTouchEnd = (event: TouchEvent) => {
  const action = inputHandler.handleTouchEnd(event)
  if (action) executeAction(action)
}

const executeAction = (action: GameAction) => {
  if (props.game.isGameOver) return
  
  switch (action) {
    case GameAction.MOVE_LEFT:
      props.game.moveLeft()
      break
    case GameAction.MOVE_RIGHT:
      props.game.moveRight()
      break
    case GameAction.ROTATE_CW:
      props.game.rotate()
      break
    case GameAction.SOFT_DROP:
      props.game.moveDown()
      break
    case GameAction.HARD_DROP:
      props.game.hardDrop()
      break
    case GameAction.HOLD:
      props.game.hold()
      break
    case GameAction.PAUSE:
      props.game.togglePause()
      break
  }
}

const renderGame = () => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Grid
  ctx.strokeStyle = '#1a1a3a'
  for (let x = 0; x <= BOARD_WIDTH; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL_SIZE, 0)
    ctx.lineTo(x * CELL_SIZE, canvasHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= BOARD_HEIGHT; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL_SIZE)
    ctx.lineTo(canvasWidth, y * CELL_SIZE)
    ctx.stroke()
  }

  // Locked blocks
  const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = props.game.board.getCell(x, y)
      if (cell > 0) {
        const color = cell === 8 ? '#666' : (COLORS[pieceTypes[cell - 1]!] ?? '#888')
        drawBlock(ctx, x, y, color)
      }
    }
  }

  // Ghost
  const ghost = props.game.getGhostPiece()
  ctx.globalAlpha = 0.3
  ghost.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))
  ctx.globalAlpha = 1.0

  // Current piece
  props.game.currentPiece.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const p = 1
  ctx.fillStyle = color
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, CELL_SIZE - p * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(x * CELL_SIZE + p, y * CELL_SIZE + p, CELL_SIZE - p * 2, 3)
}

// Re-render on game state changes
let frameId: number | null = null
const loop = () => {
  renderGame()
  frameId = requestAnimationFrame(loop)
}

onMounted(() => {
  frameId = requestAnimationFrame(loop)
})
</script>

<style scoped>
.solo-game {
  display: flex;
  justify-content: center;
}

.game-layout {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.side-panel {
  background: #16213e;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  color: #fff;
  min-width: 90px;
}

.side-panel h4 {
  margin: 0 0 0.5rem;
  color: #9d4edd;
  font-size: 0.75rem;
  letter-spacing: 2px;
}

.piece-preview {
  background: #0a0a1a;
  border-radius: 8px;
  padding: 0.5rem;
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-hint {
  color: #555;
  font-size: 1.2rem;
}

.stats {
  margin-top: 1rem;
}

.stats .score {
  font-size: 1.3rem;
  font-weight: bold;
  color: #00d4ff;
  margin: 0;
}

.stats p {
  margin: 0.2rem 0;
  font-size: 0.8rem;
  color: #aaa;
}

.board-section {
  position: relative;
}

.game-canvas {
  border: 2px solid #333;
  border-radius: 4px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 4px;
  font-size: 1.5rem;
  color: white;
  gap: 1rem;
}

.game-over span {
  color: #ff6b6b;
}

.chain {
  color: #f5576c;
  font-weight: bold;
  font-size: 0.9rem;
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0.7; transform: scale(1.05); }
}

button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}
</style>
