<template>
  <div class="container">
    <h1>🎮 Tetris Duo</h1>
    
    <!-- Board Demo -->
    <section class="demo-section">
      <h2>📦 Board Demo</h2>
      <div class="board-info">
        <p><strong>Width:</strong> {{ boardWidth }}</p>
        <p><strong>Height:</strong> {{ boardHeight }}</p>
        <p><strong>Cell (5, 10):</strong> {{ cellValue }}</p>
      </div>
      <button @click="testSetCell">Set Cell (5, 10) = 1</button>
    </section>

    <!-- Tetromino Demo -->
    <section class="demo-section">
      <h2>🧩 Tetromino Demo</h2>
      <div class="piece-display">
        <div class="piece-info">
          <p><strong>Type:</strong> {{ currentPiece.type }}</p>
          <p><strong>Position:</strong> ({{ currentPiece.x }}, {{ currentPiece.y }})</p>
          <p><strong>Rotation:</strong> {{ currentPiece.rotationIndex }}</p>
          <p><strong>Color:</strong> <span :style="{ color: currentPiece.color }">{{ currentPiece.color }}</span></p>
        </div>
        <div class="piece-grid">
          <div 
            v-for="(row, rowIdx) in pieceGrid" 
            :key="rowIdx" 
            class="piece-row"
          >
            <div 
              v-for="(cell, colIdx) in row" 
              :key="colIdx" 
              class="piece-cell"
              :class="{ filled: cell }"
              :style="{ backgroundColor: cell ? currentPiece.color : 'transparent' }"
            />
          </div>
        </div>
      </div>
      <div class="controls">
        <button @click="changePiece">Next Piece</button>
        <button @click="rotatePiece">Rotate ↻</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Board } from '~/game/Board'
import { Tetromino, type TetrominoType } from '~/game/Tetromino'

// Board Demo
const board = new Board()
const boardWidth = ref(board.width)
const boardHeight = ref(board.height)
const cellValue = ref(board.getCell(5, 10))

const testSetCell = () => {
  board.setCell(5, 10, 1)
  cellValue.value = board.getCell(5, 10)
  console.log('✅ Cell (5, 10) set to:', cellValue.value)
}

// Tetromino Demo
const pieceTypes: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
const pieceIndex = ref(0)
const currentPiece = ref(new Tetromino(pieceTypes[0]!))

const pieceGrid = computed(() => {
  const grid: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false) as boolean[])
  const blocks = currentPiece.value.getBlocks()
  const minX = Math.min(...blocks.map(b => b.x))
  const minY = Math.min(...blocks.map(b => b.y))
  
  blocks.forEach(block => {
    const row = block.y - minY
    const col = block.x - minX
    if (grid[row]) {
      grid[row]![col] = true
    }
  })
  return grid
})

const changePiece = () => {
  pieceIndex.value = (pieceIndex.value + 1) % pieceTypes.length
  currentPiece.value = new Tetromino(pieceTypes[pieceIndex.value]!)
  console.log('🧩 Changed to:', currentPiece.value.type)
}

const rotatePiece = () => {
  currentPiece.value.rotate()
  // Force reactivity update
  currentPiece.value = currentPiece.value.clone()
  console.log('↻ Rotated to index:', currentPiece.value.rotationIndex)
}

onMounted(() => {
  console.log('🎮 Tetris Duo - Demo Initialized!')
  console.log('📦 Board:', board.width, 'x', board.height)
  console.log('🧩 Tetromino:', currentPiece.value.type, 'at', currentPiece.value.x, currentPiece.value.y)
})
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
}

h1 {
  color: #00d4ff;
  margin-bottom: 2rem;
}

h2 {
  color: #9d4edd;
  margin-bottom: 1rem;
}

.demo-section {
  background: #16213e;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.board-info, .piece-info {
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  color: #fff;
}

.piece-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.piece-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.piece-row {
  display: flex;
  gap: 2px;
}

.piece-cell {
  width: 24px;
  height: 24px;
  border: 1px solid #333;
  border-radius: 4px;
}

.piece-cell.filled {
  box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.3);
}

.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
}

button {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.2s;
}

button:hover {
  transform: scale(1.05);
}
</style>

