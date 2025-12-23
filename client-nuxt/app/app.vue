<template>
  <div class="container" @keydown="handleKeydown" tabindex="0" ref="gameContainer">
    <h1>🎮 Tetris Duo</h1>
    
    <!-- Mode Selection -->
    <div v-if="!gameMode" class="mode-select">
      <button @click="startSolo" class="mode-btn solo">🎯 Solo</button>
      <button @click="startDuo" class="mode-btn duo">👥 Duo (Local)</button>
    </div>

    <!-- Solo Mode -->
    <div v-else-if="gameMode === 'solo'" class="game-area">
      <SoloGame :game="soloGame!" @restart="restartSolo" />
    </div>

    <!-- Duo Mode -->
    <div v-else-if="gameMode === 'duo'" class="duo-area">
      <!-- Player 1 Board -->
      <div class="player-section">
        <div class="player-header p1">
          <span class="player-label">P1</span>
          <span class="controls-hint">WASD + Q/E</span>
        </div>
        <PlayerBoard 
          :game="duoGame!.player1" 
          :showHold="true" 
          :showNext="true"
          playerColor="#00d4ff"
        />
        <div class="player-stats">
          <span class="score">{{ duoGame!.player1.score }}</span>
          <span>L{{ duoGame!.player1.level }} • {{ duoGame!.player1.linesCleared }}</span>
        </div>
      </div>

      <!-- VS -->
      <div class="vs-section">
        <span class="vs-text">VS</span>
        <div v-if="duoGame!.winner" class="winner-overlay">
          <span class="winner-text">🏆 P{{ duoGame!.winner }} WINS!</span>
          <button @click="restartDuo">🔄 Rematch</button>
        </div>
        <div v-if="duoGame!.isPaused && !duoGame!.winner" class="pause-text">⏸️</div>
        <button @click="backToMenu" class="back-btn">← Menu</button>
      </div>

      <!-- Player 2 Board -->
      <div class="player-section">
        <div class="player-header p2">
          <span class="player-label">P2</span>
          <span class="controls-hint">←→↓↑ + ,/.</span>
        </div>
        <PlayerBoard 
          :game="duoGame!.player2" 
          :showHold="true" 
          :showNext="true"
          playerColor="#ff6b6b"
        />
        <div class="player-stats">
          <span class="score">{{ duoGame!.player2.score }}</span>
          <span>L{{ duoGame!.player2.level }} • {{ duoGame!.player2.linesCleared }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { Game } from '~/game/Game'
import { DuoGame } from '~/game/DuoGame'

// Async components
const SoloGame = defineAsyncComponent(() => import('~/components/SoloGame.vue'))
const PlayerBoard = defineAsyncComponent(() => import('~/components/PlayerBoard.vue'))

type GameMode = 'solo' | 'duo' | null

const gameContainer = ref<HTMLDivElement | null>(null)
const gameMode = ref<GameMode>(null)
const soloGame = ref<Game | null>(null)
const duoGame = ref<DuoGame | null>(null)

let animationId: number | null = null
let lastUpdate = 0
const DROP_INTERVAL = 1000

// ============ Mode Selection ============
const startSolo = () => {
  gameMode.value = 'solo'
  soloGame.value = new Game()
  startGameLoop()
}

const startDuo = () => {
  gameMode.value = 'duo'
  duoGame.value = new DuoGame()
  startGameLoop()
}

const restartSolo = () => {
  soloGame.value = new Game()
}

const restartDuo = () => {
  duoGame.value = new DuoGame()
}

const backToMenu = () => {
  gameMode.value = null
  soloGame.value = null
  duoGame.value = null
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// ============ Game Loop ============
const startGameLoop = () => {
  const gameLoop = (timestamp: number) => {
    if (timestamp - lastUpdate > DROP_INTERVAL) {
      if (gameMode.value === 'solo' && soloGame.value && !soloGame.value.isPaused && !soloGame.value.isGameOver) {
        soloGame.value.moveDown()
      } else if (gameMode.value === 'duo' && duoGame.value) {
        duoGame.value.tick()
      }
      lastUpdate = timestamp
    }
    animationId = requestAnimationFrame(gameLoop)
  }
  animationId = requestAnimationFrame(gameLoop)
}

// ============ Keyboard Controls ============
const handleKeydown = (e: KeyboardEvent) => {
  if (gameMode.value === 'solo' && soloGame.value) {
    handleSoloControls(e)
  } else if (gameMode.value === 'duo' && duoGame.value) {
    handleDuoControls(e)
  }
}

const handleSoloControls = (e: KeyboardEvent) => {
  if (!soloGame.value || soloGame.value.isGameOver) return
  
  switch (e.key) {
    case 'ArrowLeft': soloGame.value.moveLeft(); break
    case 'ArrowRight': soloGame.value.moveRight(); break
    case 'ArrowDown': soloGame.value.moveDown(); break
    case 'ArrowUp': soloGame.value.rotate(); break
    case ' ': e.preventDefault(); soloGame.value.hardDrop(); break
    case 'c': case 'C': soloGame.value.hold(); break
    case 'p': case 'P': soloGame.value.togglePause(); break
  }
}

const handleDuoControls = (e: KeyboardEvent) => {
  if (!duoGame.value || duoGame.value.winner) return
  
  // Pause toggle
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    duoGame.value.togglePause()
    return
  }
  
  if (duoGame.value.isPaused) return
  
  // Player 1: WASD + Q/E
  switch (e.key.toLowerCase()) {
    case 'a': duoGame.value.p1MoveLeft(); break
    case 'd': duoGame.value.p1MoveRight(); break
    case 's': duoGame.value.p1MoveDown(); break
    case 'w': duoGame.value.p1Rotate(); break
    case 'q': duoGame.value.p1Hold(); break
    case 'e': duoGame.value.p1HardDrop(); break
  }
  
  // Player 2: Arrow keys + ,/.
  switch (e.key) {
    case 'ArrowLeft': duoGame.value.p2MoveLeft(); break
    case 'ArrowRight': duoGame.value.p2MoveRight(); break
    case 'ArrowDown': duoGame.value.p2MoveDown(); break
    case 'ArrowUp': duoGame.value.p2Rotate(); break
    case ',': duoGame.value.p2Hold(); break
    case '.': duoGame.value.p2HardDrop(); break
  }
}

onMounted(() => {
  gameContainer.value?.focus()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
  outline: none;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
}

h1 {
  color: #00d4ff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

/* Mode Selection */
.mode-select {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 4rem;
}

.mode-btn {
  padding: 2rem 3rem;
  font-size: 1.5rem;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.mode-btn.solo {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.mode-btn.duo {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.mode-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* Duo Area */
.duo-area {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.player-section {
  background: rgba(22, 33, 62, 0.8);
  padding: 1rem;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}

.player-header.p1 {
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.3), transparent);
}

.player-header.p2 {
  background: linear-gradient(90deg, transparent, rgba(255, 107, 107, 0.3));
}

.player-label {
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
}

.controls-hint {
  font-size: 0.75rem;
  color: #888;
}

.player-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.5rem;
  color: #aaa;
  font-size: 0.9rem;
}

.player-stats .score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #00d4ff;
}

/* VS Section */
.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  gap: 1rem;
}

.vs-text {
  font-size: 2rem;
  font-weight: bold;
  color: #9d4edd;
  text-shadow: 0 0 20px rgba(157, 78, 221, 0.5);
}

.winner-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
}

.winner-text {
  font-size: 1.2rem;
  color: #ffd700;
  font-weight: bold;
}

.pause-text {
  font-size: 2rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.1);
  color: #aaa;
  border: 1px solid #555;
  border-radius: 8px;
  cursor: pointer;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
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
  transform: scale(1.02);
}
</style>
