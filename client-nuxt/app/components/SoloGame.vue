<template>
  <div class="solo-game">
    <div class="game-layout">
      <!-- Mobile 1: Mode Label -->
      <div class="mode-label mobile-only" :class="{ special: isSpecialMode }">
          {{ isSpecialMode ? '✨ SPECIAL' : '🎯 SOLO' }}
      </div>
      <!-- Hold (Special mode only) -->
      <div v-if="isSpecialMode" class="side-panel hold-panel">
        <h4>HOLD</h4>
        <div class="piece-preview" :style="{ opacity: game.heldPiece ? 1 : 0.3 }">
          <MiniPiece v-if="game.heldPiece" :piece="game.heldPiece" />
          <span v-else class="empty-hint">C</span>
        </div>
      </div>
      <!-- Spacer when no hold panel -->
      <div v-else class="side-panel-spacer desktop-only"></div>

      <!-- Next Panel (Desktop: all info. Mobile: only Preview) -->
      <div class="side-panel next-panel" :class="{ 'full-width': !isSpecialMode }">
        <h4>NEXT</h4>
        <div class="piece-preview">
          <MiniPiece :piece="game.nextPiece" />
        </div>
        
        <!-- Desktop: Stats & Effect & Controls -->
        <div class="stats desktop-only">
          <p class="score">{{ game.score }}</p>
          <p>Level {{ game.level }}</p>
          <p>Lines {{ game.linesCleared }}</p>
          <p v-if="isSpecialMode && 'chainCount' in game && (game as any).chainCount > 0" class="chain">
            🔥 {{ (game as any).chainCount }}-Chain!
          </p>
        </div>
        
        <div v-if="isSpecialMode" class="effect-selector desktop-only">
          <label>Effect:</label>
          <select v-model="selectedEffect" @change="onEffectChange">
            <option v-for="(label, type) in effectLabels" :key="type" :value="type">
              {{ label }}
            </option>
          </select>
        </div>

        <div class="control-buttons desktop-only">
          <button class="ctrl-btn" @click="game.togglePause()" :title="game.isPaused ? 'Resume' : 'Pause'">
            {{ game.isPaused ? '▶️' : '⏸️' }}
          </button>
          <button class="ctrl-btn" @click="showGhost = !showGhost" :title="showGhost ? 'Hide Ghost' : 'Show Ghost'">
            {{ showGhost ? '👻' : '👤' }}
          </button>
          <button class="ctrl-btn" @click="$emit('back')" title="Back to Menu">
            🏠
          </button>
        </div>
      </div>

      <!-- Mobile: Row 2 (Score | Effect) -->
      <div class="mobile-stats-row mobile-only">
          <div class="stats-box">
             <p class="score">{{ game.score }}</p>
             <p>L{{ game.level }} • Lines {{ game.linesCleared }}</p> 
             <p v-if="isSpecialMode && 'chainCount' in game && (game as any).chainCount > 0" class="chain">
                🔥 {{ (game as any).chainCount }}
             </p>
          </div>
          
          <div v-if="isSpecialMode" class="effect-box">
              <select v-model="selectedEffect" @change="onEffectChange" class="mobile-select">
                <option v-for="(label, type) in effectLabels" :key="type" :value="type">
                  {{ label }}
                </option>
              </select>
          </div>
          <!-- If not special mode, maybe stretch stats or leave empty? User asked for | Score | Effect |. 
               I'll let stats take full width if no effect. -->
      </div>

      <!-- Mobile: Row 3 (Controls) -->
      <div class="control-buttons mobile-only mobile-controls-row">
          <button class="ctrl-btn" @click="game.togglePause()" :title="game.isPaused ? 'Resume' : 'Pause'">
            {{ game.isPaused ? '▶️' : '⏸️' }}
          </button>
          <button class="ctrl-btn" @click="showGhost = !showGhost" :title="showGhost ? 'Hide Ghost' : 'Show Ghost'">
            {{ showGhost ? '👻' : '👤' }}
          </button>
          <button class="ctrl-btn" @click="$emit('back')" title="Back to Menu">
            🏠
          </button>
      </div>

      <div class="board-section">
        <div class="mode-label desktop-only" :class="{ special: isSpecialMode }">
          {{ isSpecialMode ? '✨ SPECIAL' : '🎯 SOLO' }}
        </div>
        <canvas 
          ref="canvas" 
          :width="canvasWidth" 
          :height="canvasHeight"
          class="game-canvas"
          @touchstart.prevent="handleTouchStart"
          @touchmove.prevent="handleTouchMove"
          @touchend.prevent="handleTouchEnd"
        />
        <div v-if="game.isPaused && !game.isGameOver" class="overlay">
            <div class="overlay-content">
                <span class="paused-text">⏸️ PAUSED</span>
                <div class="overlay-buttons">
                    <button class="resume-btn" @click="game.togglePause()" title="Resume">▶️ Resume</button>
                    <button class="home-btn" @click="$emit('back')" title="Back to Menu">🏠 Menu</button>
                </div>
            </div>
        </div>
        <div v-if="game.isGameOver" class="overlay game-over">
          <span>💀 GAME OVER</span>
          
          <!-- High Score Input -->
          <div v-if="isNewHighScore" class="high-score-form">
            <span class="high-score-label">
              {{ highScoreLabel }}
            </span>
            
            <!-- Case 1: Already Saved (Auto-saved) -->
            <div v-if="scoreSaved && !isEditingName" class="saved-feedback">
              <span class="saved-text">✅ Saved as <span class="highlight-name">{{ savedPlayerName }}</span></span>
              <button @click="isEditingName = true" class="edit-btn" title="Edit Name">✏️</button>
            </div>
            
            <!-- Case 2: Editing Name (After auto-save) -->
            <div v-else-if="scoreSaved && isEditingName" class="edit-saved-form">
               <input 
                v-model="playerName" 
                type="text" 
                placeholder="New name" 
                maxlength="12"
                class="name-input"
                @keyup.enter="updateSavedName"
              />
              <button @click="updateSavedName" class="save-btn">Update</button>
              <button @click="isEditingName = false" class="cancel-btn">Cancel</button>
            </div>

            <!-- Case 3: New Player (First time) -->
            <div v-else-if="!scoreSaved && !savedPlayerName" class="new-player-form">
              <input 
                v-model="playerName" 
                type="text" 
                placeholder="Enter your name" 
                maxlength="12"
                class="name-input"
                @keyup.enter="saveHighScore"
              />
              <button @click="saveHighScore" class="save-btn">Save</button>
            </div>
          </div>
          
          <div class="game-over-buttons">
            <button @click="$emit('restart')">🔄 Restart</button>
            <button @click="showLeaderboard = true" class="leaderboard-btn">🏆 Leaderboard</button>
             <button @click="$emit('back')" title="Back to Menu" class="home-btn">🏠 Menu</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Leaderboard Modal -->
    <Leaderboard 
      v-if="showLeaderboard" 
      :highlightRank="savedRank ?? undefined"
      :highlightMode="gameMode"
      :initialTab="gameMode"
      @close="showLeaderboard = false" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineAsyncComponent, computed } from 'vue'
import { Game } from '~/game/Game'
import { SpecialGame, EffectType, EFFECT_LABELS, type LineClearEffect, type WaveEffect, type Particle } from '~/game/SpecialGame'
import { COLORS } from '~/game/shapes'
import { useTouchControls } from '~/composables/useTouchControls'
import { LeaderboardService, type GameMode } from '~/services/LeaderboardService'

const MiniPiece = defineAsyncComponent(() => import('./MiniPiece.vue'))
const Leaderboard = defineAsyncComponent(() => import('./Leaderboard.vue'))

const props = defineProps<{
  game: Game
  isSpecialMode?: boolean
}>()

defineEmits(['restart', 'back'])

const CELL_SIZE = 24
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const canvasWidth = BOARD_WIDTH * CELL_SIZE
const canvasHeight = BOARD_HEIGHT * CELL_SIZE

const canvas = ref<HTMLCanvasElement | null>(null)
// ============ Mobile Touch Controls (using composable) ============
const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchControls(
    () => props.game,
    {
        checkPause: true,
        onHold: () => {
            // Special mode: Hold only works if not cascading
            if (props.isSpecialMode && 'isCascading' in props.game && (props.game as any).isCascading) {
                return // Don't hold during cascade
            }
            props.game.hold()
        }
    }
)
const selectedEffect = ref<EffectType>(EffectType.EXPLOSION)
const showGhost = ref(false)
const effectLabels = EFFECT_LABELS

// ============ High Score & Leaderboard ============
const PLAYER_NAME_KEY = 'tetris-player-name'
const showLeaderboard = ref(false)
const playerName = ref('')
const scoreSaved = ref(false)
const savedRank = ref<number | null>(null)
const isEditingName = ref(false)
const currentEntryId = ref<string | null>(null)

// Load saved player name from localStorage
// Using ref for manual update to ensure UI reactivity
const savedPlayerName = ref('')

onMounted(() => {
    if (typeof localStorage !== 'undefined') {
        savedPlayerName.value = localStorage.getItem(PLAYER_NAME_KEY) || ''
    }
})

const gameMode = computed<GameMode>(() => props.isSpecialMode ? 'special' : 'solo')

const isNewHighScore = computed(() => {
  return props.game.isGameOver && LeaderboardService.isHighScore(props.game.score, gameMode.value)
})

const highScoreLabel = computed(() => {
  if (!isNewHighScore.value) return ''
  
  const rank = LeaderboardService.getPotentialRank(props.game.score, gameMode.value)
  return rank === 1 ? '🏆 NEW RECORD!' : '🎉 TOP 10 ENTRY!'
})

const saveHighScore = () => {
  // Use saved name if available and not editing, otherwise use input
  const nameToSave = (savedPlayerName.value && !isEditingName.value) 
    ? savedPlayerName.value 
    : playerName.value.trim()
  
  if (!nameToSave) return
  
  // Save name to localStorage for next time
  localStorage.setItem(PLAYER_NAME_KEY, nameToSave)
  savedPlayerName.value = nameToSave
  
  const result = LeaderboardService.addScore({
    playerName: nameToSave,
    score: props.game.score,
    level: props.game.level,
    lines: props.game.linesCleared,
    date: new Date().toISOString()
  }, gameMode.value)
  
  scoreSaved.value = true
  savedRank.value = result.rank
  currentEntryId.value = result.id
}

const updateSavedName = () => {
    if (!playerName.value.trim()) return

    // Update local storage
    localStorage.setItem(PLAYER_NAME_KEY, playerName.value.trim())
    savedPlayerName.value = playerName.value.trim()
    
    // Update existing entry if we have ID
    if (currentEntryId.value) {
        LeaderboardService.updateEntryName(currentEntryId.value, playerName.value.trim(), gameMode.value)
    } else {
        // Fallback if no ID (shouldn't happen in flow)
        saveHighScore()
    }

    isEditingName.value = false
    scoreSaved.value = true
}



// Auto-save watch
watch(isNewHighScore, (newVal) => {
    if (newVal && savedPlayerName.value && !scoreSaved.value) {
        // Auto-save immediately
        saveHighScore()
    }
})

// Reset high score state when game restarts
watch(() => props.game.isGameOver, (isOver) => {
  if (!isOver) {
    scoreSaved.value = false
    savedRank.value = null
    playerName.value = ''
    isEditingName.value = false
    currentEntryId.value = null
  }
})

const onEffectChange = () => {
  if (props.isSpecialMode && 'setEffectType' in props.game) {
    (props.game as SpecialGame).setEffectType(selectedEffect.value)
  }
}

// Touch handlers are now provided by useTouchControls composable (see line ~155)

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

  // Ghost (if enabled)
  if (showGhost.value) {
    const ghost = props.game.getGhostPiece()
    ctx.globalAlpha = 0.3
    ghost.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))
    ctx.globalAlpha = 1.0
  }

  // Current piece
  props.game.currentPiece.getBlocks().forEach(b => drawBlock(ctx, b.x, b.y, props.game.currentPiece.color))

  // Line clear effects (Special mode only)
  if (props.isSpecialMode && 'effects' in props.game) {
    const specialGame = props.game as SpecialGame
    
    // Flash effect
    specialGame.effects.forEach(effect => {
      if (effect.type === 'LINE_CLEAR') {
        const alpha = effect.timeLeft / 300
        ctx.fillStyle = effect.color
        ctx.globalAlpha = alpha * 0.6
        ctx.fillRect(0, effect.y * CELL_SIZE, canvasWidth, CELL_SIZE)
        ctx.globalAlpha = 1.0
      } else if (effect.type === 'WAVE') {
        // Wave ripple effect
        ctx.beginPath()
        ctx.arc(effect.centerX, effect.centerY, effect.radius, 0, Math.PI * 2)
        ctx.strokeStyle = effect.color
        ctx.lineWidth = 4
        ctx.globalAlpha = effect.life * 0.8
        ctx.stroke()
        ctx.globalAlpha = 1.0
      }
    })

    // Particles
    if ('particles' in specialGame) {
      specialGame.particles.forEach(p => {
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
  min-width: 150px;
}

.side-panel h4 {
  margin: 0 0 0.5rem;
  color: #9d4edd;
  font-size: 0.75rem;
  letter-spacing: 2px;
}

.side-panel-spacer {
  width: 100px;
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

.mode-label {
  text-align: center;
  padding: 0.4rem 0.8rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.mode-label.special {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  animation: glow 1.5s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 5px rgba(240, 147, 251, 0.5); }
  to { box-shadow: 0 0 15px rgba(245, 87, 108, 0.8); }
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

.effect-selector {
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #333;
}

.effect-selector label {
  display: block;
  font-size: 0.7rem;
  color: #888;
  margin-bottom: 0.3rem;
}

.effect-selector select {
  width: 100%;
  padding: 0.4rem;
  font-size: 0.8rem;
  background: #1a1a3a;
  color: white;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
}

.effect-selector select:focus {
  outline: none;
  border-color: #9d4edd;
}

.control-buttons {
  display: flex;
  gap: 0.4rem;
  margin-top: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #333;
}

.ctrl-btn {
  flex: 1;
  padding: 0.5rem;
  font-size: 1rem;
  background: #1a1a3a;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.ctrl-btn:hover {
  background: #2a2a4a;
}

.ctrl-btn:active {
  background: #3a3a5a;
}

/* High Score Form */
.high-score-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  padding: 0.8rem;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.high-score-label {
  color: #ffd700;
  font-size: 1.1rem;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: glow 1s ease-in-out infinite alternate;
}

.name-input {
  width: 150px;
  padding: 0.5rem;
  font-size: 1rem;
  text-align: center;
  background: #1a1a3a;
  color: white;
  border: 2px solid #9d4edd;
  border-radius: 8px;
  outline: none;
}

.name-input::placeholder {
  color: #666;
}

/* Saved Feedback */
.saved-feedback {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  background: rgba(0, 255, 136, 0.15);
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.4);
  animation: pulse 2s infinite;
}

.saved-text {
  color: #00ff88;
  font-size: 1rem;
}

.highlight-name {
  font-weight: bold;
  color: #fff;
  text-decoration: underline;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
}

.edit-saved-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.new-player-form {
  display: flex;
  gap: 0.5rem;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #666;
  color: #ccc;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
}

.edit-btn:hover, .cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.name-input:focus {
  border-color: #00d4ff;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.save-btn {
  padding: 0.4rem 1.5rem;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  font-weight: bold;
}

.game-over-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.leaderboard-btn {
  background: linear-gradient(135deg, #9d4edd, #764ba2);
}

/* Saved Name Row */
.saved-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-name {
  padding: 0.5rem 1rem;
  background: #1a1a3a;
  border: 2px solid #00d4ff;
  border-radius: 8px;
  color: #00d4ff;
  font-weight: bold;
  font-size: 1rem;
}

.edit-btn {
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #666;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}


/* Overlay Updates */
.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
}

.overlay-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 80%;
  max-width: 250px;
}

.resume-btn {
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  color: #004400;
  padding: 0.8rem;
  font-size: 1.2rem;
  font-weight: bold;
  width: 100%;
  border-radius: 8px;
  border: none;
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
  animation: pulse-green 2s infinite;
  cursor: pointer;
}

.home-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid #666;
  color: #ccc;
  padding: 0.8rem;
  width: 100%;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.home-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

@keyframes pulse-green {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  
  .mobile-only {
    display: block;
  }

  .game-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    width: 100%;
    align-items: center;
  }
  
  /* 1. Mode Label (Full width top) */
  .mode-label.mobile-only {
    grid-column: 1 / -1;
    margin-bottom: 0;
    text-align: center;
    order: 1;
  }
  
  /* 2. Controls (Row 2 - Full Width) */
  .mobile-controls-row {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(0,0,0,0.2);
    border-radius: 8px;
    order: 2;
  }

  /* 3. Stats & Effect (Row 3 - Full Width) */
  .mobile-stats-row {
    grid-column: 1 / -1;
    display: flex;
    gap: 1rem;
    width: 100%;
    background: #6385db; /* Lighter background for contrast */
    border-radius: 8px;
    padding: 0.8rem;
    align-items: center;
    justify-content: space-around;
    order: 3;
    border: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
  }
  
  .mobile-stats-row .stats-box p {
    color: #0f0c29; /* Dark text for contrast */
    font-weight: 500;
  }
  
  .mobile-stats-row .stats-box .score {
    color: #000; /* Distinct dark score */
    text-shadow: none;
  }
  
  /* 4. Hold Panel (Left) */
  .hold-panel {
    grid-column: 1;
    width: 100%;
    max-width: none;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    order: 4;
  }

  /* 4. Next Panel (Right or Full) */
  .next-panel {
    grid-column: 2;
    width: 100%;
    max-width: none;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    order: 4;
  }
  
  .next-panel.full-width {
    grid-column: 1 / -1;
  }

  /* 5. Board (Full width bottom) */
  .board-section {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
    order: 5;
  }

  .game-canvas {
    max-width: 95vw; 
    height: auto;
  }
  
  /* Reset panel styles for mobile grid items */
  .side-panel {
    margin: 0;
    min-width: 0;
    background: #6385db; /* Lighter background for contrast */
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .side-panel h4 {
    color: #0f0c29; /* Darker text for contrast */
    font-weight: 900;
    text-shadow: none;
  }
  
  .side-panel-spacer {
    display: none;
  }
}

</style>
