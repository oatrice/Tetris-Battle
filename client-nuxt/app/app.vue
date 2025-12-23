<template>
  <div class="container" @keydown="handleKeydown" tabindex="0" ref="gameContainer">
    <h1>🎮 Tetris Duo</h1>
    
    <div class="game-area">
      <!-- Hold Piece -->
      <div class="side-panel">
        <h4>HOLD</h4>
        <div class="piece-preview" :style="{ opacity: game.heldPiece ? 1 : 0.3 }">
          <div v-if="game.heldPiece" class="mini-grid">
            <div 
              v-for="(row, y) in getPieceGrid(game.heldPiece)" 
              :key="y" 
              class="mini-row"
            >
              <div 
                v-for="(cell, x) in row" 
                :key="x" 
                class="mini-cell"
                :style="{ backgroundColor: cell ? game.heldPiece.color : 'transparent' }"
              />
            </div>
          </div>
          <span v-else class="empty-hint">C</span>
        </div>
      </div>

      <!-- Game Board -->
      <div class="board-container">
        <canvas 
          ref="canvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="game-canvas"
        />
        <div v-if="game.isPaused" class="pause-overlay">
          <span>⏸️ PAUSED</span>
        </div>
        <div v-if="game.isGameOver" class="gameover-overlay">
          <span>💀 GAME OVER</span>
          <button @click="restartGame">🔄 Restart</button>
        </div>
      </div>

      <!-- Next Piece & Info -->
      <div class="side-panel">
        <h4>NEXT</h4>
        <div class="piece-preview">
          <div class="mini-grid">
            <div 
              v-for="(row, y) in getPieceGrid(game.nextPiece)" 
              :key="y" 
              class="mini-row"
            >
              <div 
                v-for="(cell, x) in row" 
                :key="x" 
                class="mini-cell"
                :style="{ backgroundColor: cell ? game.nextPiece.color : 'transparent' }"
              />
            </div>
          </div>
        </div>
        
        <div class="stats">
          <p class="score">{{ game.score }}</p>
          <p>Level {{ game.level }}</p>
          <p>Lines {{ game.linesCleared }}</p>
        </div>
        
        <div class="controls-hint">
          <small>←→ ↓↑ Space Hold:C P</small>
        </div>
        
        <button @click="restartGame" class="restart-btn">🔄</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Game } from '~/game/Game'
import { COLORS } from '~/game/shapes'

const CELL_SIZE = 24
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const canvas = ref<HTMLCanvasElement | null>(null)
const gameContainer = ref<HTMLDivElement | null>(null)
const game = ref(new Game())
let animationId: number | null = null
let lastUpdate = 0
const DROP_INTERVAL = 1000 // 1 second per drop

const restartGame = () => {
  game.value = new Game()
}

// Helper to create a 4x4 grid for piece preview
const getPieceGrid = (piece: { getBlocks: () => { x: number, y: number }[] }) => {
  const grid: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false) as boolean[])
  const blocks = piece.getBlocks()
  const minX = Math.min(...blocks.map(b => b.x))
  const minY = Math.min(...blocks.map(b => b.y))
  
  blocks.forEach(block => {
    const row = block.y - minY
    const col = block.x - minX
    if (row >= 0 && row < 4 && col >= 0 && col < 4 && grid[row]) {
      grid[row]![col] = true
    }
  })
  return grid
}
const handleKeydown = (e: KeyboardEvent) => {
  if (game.value.isGameOver) return
  
  switch (e.key) {
    case 'ArrowLeft':
      game.value.moveLeft()
      break
    case 'ArrowRight':
      game.value.moveRight()
      break
    case 'ArrowDown':
      game.value.moveDown()
      break
    case 'ArrowUp':
      game.value.rotate()
      break
    case ' ':
      e.preventDefault()
      game.value.hardDrop()
      break
    case 'c':
    case 'C':
      game.value.hold()
      break
    case 'p':
    case 'P':
      game.value.togglePause()
      break
  }
  renderGame()
}

const renderGame = () => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw grid
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

  // Draw locked blocks
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = game.value.board.getCell(x, y)
      if (cell > 0) {
        const pieceTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
        const color = COLORS[pieceTypes[cell - 1]!] ?? '#888'
        drawBlock(ctx, x, y, color)
      }
    }
  }

  // Draw ghost piece
  const ghost = game.value.getGhostPiece()
  const ghostBlocks = ghost.getBlocks()
  ctx.globalAlpha = 0.3
  ghostBlocks.forEach(block => {
    drawBlock(ctx, block.x, block.y, game.value.currentPiece.color)
  })
  ctx.globalAlpha = 1.0

  // Draw current piece
  const blocks = game.value.currentPiece.getBlocks()
  blocks.forEach(block => {
    drawBlock(ctx, block.x, block.y, game.value.currentPiece.color)
  })
}

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
  const padding = 1
  ctx.fillStyle = color
  ctx.fillRect(
    x * CELL_SIZE + padding,
    y * CELL_SIZE + padding,
    CELL_SIZE - padding * 2,
    CELL_SIZE - padding * 2
  )
  
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(
    x * CELL_SIZE + padding,
    y * CELL_SIZE + padding,
    CELL_SIZE - padding * 2,
    4
  )
}

const gameLoop = (timestamp: number) => {
  if (!game.value.isPaused && !game.value.isGameOver) {
    if (timestamp - lastUpdate > DROP_INTERVAL) {
      game.value.moveDown()
      lastUpdate = timestamp
    }
  }
  renderGame()
  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  gameContainer.value?.focus()
  animationId = requestAnimationFrame(gameLoop)
  console.log('🎮 Game started!')
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 1rem auto;
  padding: 1rem;
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
  outline: none;
}

h1 {
  color: #00d4ff;
  margin-bottom: 1rem;
}

.game-area {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.board-container {
  position: relative;
}

.game-canvas {
  border: 2px solid #333;
  border-radius: 4px;
  background: #0a0a1a;
}

.pause-overlay,
.gameover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
}

.pause-overlay span,
.gameover-overlay span {
  font-size: 1.5rem;
  color: #fff;
  font-weight: bold;
}

.side-panel {
  background: #16213e;
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  color: #fff;
  min-width: 100px;
}

.side-panel h4 {
  margin: 0 0 0.5rem;
  color: #9d4edd;
  font-size: 0.8rem;
  letter-spacing: 2px;
}

.piece-preview {
  background: #0a0a1a;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
}

.mini-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-row {
  display: flex;
  gap: 2px;
}

.mini-cell {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #222;
}

.empty-hint {
  color: #555;
  font-size: 1.5rem;
}

.stats {
  margin: 1rem 0;
  text-align: center;
}

.stats .score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00d4ff;
  margin: 0;
}

.stats p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #aaa;
}

.controls-hint {
  margin: 0.5rem 0;
  color: #666;
}

.restart-btn {
  width: 100%;
  padding: 0.5rem;
  font-size: 1.2rem;
}

button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 0.5rem;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.02);
}
</style>
