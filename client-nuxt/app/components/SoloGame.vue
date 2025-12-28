<template>
  <div class="solo-game" ref="gameContainer" :class="{ 'force-fullscreen': isFullscreen }">
    <div class="game-layout">
      <!-- Mobile 1: Mode Label -->
      <!-- Mobile 1: Mode Label (HIDDEN) -->

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
      <!-- Mobile: Top Bar (Score + Pause) -->
      <!-- Mobile: Top Bar Elements (Direct Grid Children) -->
      <!-- Left: Score Box (50%) -->
      <div class="stats-box mobile-only">
          <span class="score-label">SCORE</span>
          <span class="score-value">{{ game.score }}</span>
      </div>

      <!-- Right: Pause Button (50%) -->
      <button class="ctrl-btn pause-btn mobile-only" @click="game.togglePause()">
        {{ game.isPaused ? '▶️ RESUME' : '⏸️ PAUSE' }}
      </button>

      <div class="board-section">
        <div class="mode-label desktop-only" :class="{ special: isSpecialMode }">
          {{ isSpecialMode ? '✨ SPECIAL' : '🎯 NORMAL' }}
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

const CELL_SIZE = 26
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
        ctx.lineWidth = 1 // Reset lineWidth to avoid affecting grid
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

// Ref for auto-scroll
const gameContainer = ref<HTMLElement | null>(null)

// Fullscreen state
const isFullscreen = ref(false)
const showFullscreenToast = ref(false)

// Check if mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

// Toggle fullscreen mode
const toggleFullscreen = async () => {
  // Hide toast immediately when user taps
  showFullscreenToast.value = false
  
  try {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      // Exit fullscreen
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      }
      isFullscreen.value = false
    } else {
      // Enter fullscreen
      const elem = document.documentElement
      let succeeded = false

      if (elem.requestFullscreen) {
        try {
            await elem.requestFullscreen()
            succeeded = true
        } catch (e) {
            console.log('[Fullscreen] Standard API failed, trying fallback')
        }
      } else if ((elem as any).webkitRequestFullscreen) {
         try {
            await (elem as any).webkitRequestFullscreen()
            succeeded = true
         } catch (e) {
            console.log('[Fullscreen] Webkit API failed, trying fallback')
         }
      }
      
      // Always set isFullscreen to true to trigger CSS fallback class
      // This ensures Safari iOS (which often lacks API or requires specific conditions)
      // still gets the 'fullscreen-like' UI via CSS.
      isFullscreen.value = true
      
      // Scroll to game board after fullscreen
      setTimeout(() => {
        gameContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 300)
    }
  } catch (e) {
    console.log('[Fullscreen] Error:', e)
    // Fallback: Just toggle the CSS fullscreen state
    isFullscreen.value = !isFullscreen.value
    if (isFullscreen.value) {
      // Scroll to game board
      setTimeout(() => {
        gameContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 300)
    }
  }
}

onMounted(() => {
  frameId = requestAnimationFrame(loop)
  
  // Auto scroll on mobile
  if (isMobile() && gameContainer.value) {
    setTimeout(() => {
      gameContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 300)
  }
})
</script>

<style scoped>
.solo-game {
  display: flex;
  justify-content: center;
  min-height: 100vh;
  align-items: flex-start;
  padding-top: 0.5rem;
  position: relative;
}


/* Fullscreen Toast */
.fullscreen-toast {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #00d4ff, #0072ff);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
  animation: pulse-toast 1s ease-in-out infinite alternate;
  cursor: pointer;
}

/* Force Fullscreen Mode (Safari iOS Fallback) */
.solo-game.force-fullscreen {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh; /* Use dynamic viewport height for mobile */
  z-index: 9999;
  background: #0f0c29;
  margin: 0;
  padding: 0.5rem;
  overflow-y: auto; /* Allow scrolling content if needed */
  align-items: center; /* Center content vertically */
}

@keyframes pulse-toast {
  from { transform: translateX(-50%) scale(1); }
  to { transform: translateX(-50%) scale(1.05); }
}

/* Toast Transition */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toast-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}

.game-layout {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

/* Desktop: Normal size UI */
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

  /* Fullscreen mode for mobile */
  .solo-game {
    min-height: 100dvh; /* Dynamic viewport height for mobile browsers */
    padding: 0.25rem;
    margin: 0;
    align-items: center;
    background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  }

  .game-layout {
    display: grid;
    /* 2 Columns for Hold/Next */
    grid-template-columns: 1fr 1fr;
    /* Rows: Top(Score/Pause) | Panels | Board */
    grid-template-rows: 28px auto 1fr;
    grid-template-areas: 
      "score  pause"
      "hold   next"
      "board  board";
    gap: 0.3rem;
    width: 100%;
    max-width: 100vw;
    height: 100dvh; /* Dynamic Height */
    align-items: start;
    justify-items: center;
    padding: 0.2rem;
  }
  
  /* 2. Mobile Top Items (Score + Pause 1:1) */
  .stats-box {
    grid-area: score;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    border-radius: 4px;
    display: flex;
    flex-direction: row; 
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0 0.3rem;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .score-label {
    font-size: 0.5rem; 
    color: #ccc;
    font-weight: bold;
    margin: 0;
  }

  .score-value {
    font-size: 0.75rem;
    color: #ffd700;
    font-weight: bold;
    line-height: 1;
  }

  .pause-btn.mobile-only {
    grid-area: pause;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #ff416c, #ff4b2b) !important;
    border: none;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    font-size: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: none;
    padding: 0;
    margin: 0;
  }

  .piece-preview {
    border-radius: 4px;
    padding: 0;
    min-height: 40px;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0,0,0,0.2); 
    flex: 1; /* Take available space */
  }

  /* 4. Panels (Grid positioned) */
  .hold-panel, .next-panel {
    position: relative;
    width: 100%; /* Fill grid cell */
    max-width: none; /* Remove limit to match top bar alignment */
    height: auto;
    
    /* COMPACT STYLES */
    background: #16213e; 
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0.2rem;
    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-self: stretch; /* STRETCH TO FILL GRID CELL */
    margin: 0;
    z-index: 10;
  }

  .hold-panel { grid-area: hold; }
  .next-panel { grid-area: next; }

  /* 5. Board (Center Grid) */
  .board-section {
    grid-area: board;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 0;
    margin: 0; /* Reset */
    overflow: hidden;
  }

  .game-canvas {
    height: auto;
    /* Revert to original calculation */
    max-height: calc(100vh - 100px);
    width: auto;
    max-width: 100%;
    object-fit: contain; 
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    background: rgba(0,0,0,0.3);
  }



  
  /* Reset panel styles */

  
  .side-panel h4 {
    color: #aaa;
    font-size: 0.5rem;
    margin-bottom: 2px;
    text-shadow: 1px 1px 2px black;
  }

  /* Make sure Next Panel is not full width in special mode */
  .next-panel.full-width {
    grid-column: 1 / -1; /* Span full row */
    width: 100%; 
    max-width: none; /* UNLIMITED WIDTH */
    border-radius: 4px; /* Optional: edge to edge look */
    justify-self: stretch;
  }
  
  /* Hide unused leftovers */
  .mobile-controls-row,
  .mobile-stats-row,
  .mode-label.mobile-only {
    display: none;
  }

}

</style>
