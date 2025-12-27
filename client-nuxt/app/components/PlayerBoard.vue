<template>
  <div class="player-board">
    <div class="board-layout">
      <!-- Hold -->
      <div v-if="showHold" class="mini-panel">
        <div class="panel-label">HOLD</div>
        <div class="piece-box" :style="{ opacity: game.heldPiece ? 1 : 0.3 }">
          <MiniPiece v-if="game.heldPiece" :piece="game.heldPiece" :size="12" />
        </div>
      </div>

      <!-- Canvas -->
      <div class="board-container">
        <canvas 
          ref="canvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="game-canvas"
          :style="{ borderColor: playerColor }"
        />
        <div v-if="game.isGameOver" class="overlay">💀</div>
      </div>

      <!-- Next -->
      <div v-if="showNext" class="mini-panel">
        <div class="panel-label">NEXT</div>
        <div class="piece-box">
          <MiniPiece :piece="game.nextPiece" :size="12" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { Game } from '~/game/Game'
import { COLORS } from '~/game/shapes'

const MiniPiece = defineAsyncComponent(() => import('./MiniPiece.vue'))

const props = withDefaults(defineProps<{
  game: Game
  showHold?: boolean
  showNext?: boolean
  showGhost?: boolean
  playerColor?: string
}>(), {
  showHold: true,
  showNext: true,
  showGhost: true,
  playerColor: '#333'
})

const CELL_SIZE = 20
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const canvas = ref<HTMLCanvasElement | null>(null)

const renderGame = () => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Grid
  ctx.strokeStyle = '#1a1a2a'
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
        const color = cell === 8 ? '#555' : (COLORS[pieceTypes[cell - 1]!] ?? '#888')
        drawBlock(ctx, x, y, color)
      }
    }
  }

  // Ghost (only if enabled)
  if (props.showGhost) {
    const ghost = props.game.getGhostPiece()
    ctx.globalAlpha = 0.25
    ghost.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))
    ctx.globalAlpha = 1.0
  }

  // Current piece
  props.game.currentPiece.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))

  // Line clear effects (OnlineGame)
  if ('effects' in props.game) {
    const game = props.game as any
    
    // Flash effects
    game.effects?.forEach((effect: any) => {
      if (effect.type === 'LINE_CLEAR') {
        const alpha = effect.timeLeft / 300
        ctx.fillStyle = effect.color
        ctx.globalAlpha = alpha * 0.6
        ctx.fillRect(0, effect.y * CELL_SIZE, canvasWidth, CELL_SIZE)
        ctx.globalAlpha = 1.0
      } else if (effect.type === 'WAVE') {
        ctx.beginPath()
        ctx.arc(effect.centerX, effect.centerY, effect.radius, 0, Math.PI * 2)
        ctx.strokeStyle = effect.color
        ctx.lineWidth = 4
        ctx.globalAlpha = effect.life * 0.8
        ctx.stroke()
        ctx.globalAlpha = 1.0
        ctx.lineWidth = 1 // Reset lineWidth to avoid affecting grid
      }
    })

    // Particles
    game.particles?.forEach((p: any) => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      
      if (p.isSquare && p.rotation !== undefined) {
        // Shatter effect - rotating squares
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      } else {
        // Circle particles
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      
      ctx.globalAlpha = 1.0
    })
  }
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, CELL_SIZE - 2, 2)
}

let frameId: number | null = null
onMounted(() => {
  const loop = () => {
    renderGame()
    frameId = requestAnimationFrame(loop)
  }
  frameId = requestAnimationFrame(loop)
})
</script>

<style scoped>
.player-board {
  display: flex;
  justify-content: center;
}

.board-layout {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.mini-panel {
  min-width: 60px;
  text-align: center;
}

.panel-label {
  font-size: 0.6rem;
  color: #666;
  letter-spacing: 1px;
  margin-bottom: 0.25rem;
}

.piece-box {
  background: #0a0a1a;
  border-radius: 6px;
  padding: 0.4rem;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-container {
  position: relative;
}

.game-canvas {
  border: 2px solid;
  border-radius: 4px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 4px;
  font-size: 3rem;
}
</style>
