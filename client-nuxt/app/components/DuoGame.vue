<template>
  <div class="duo-area">
    <!-- Player 1 Board -->
    <div class="player-touch-wrapper p1-touch-zone"
         @touchstart="p1Controls.handleTouchStart" 
         @touchmove="p1Controls.handleTouchMove" 
         @touchend="p1Controls.handleTouchEnd">
         
        <div class="player-section">
            <div class="player-header p1">
                <span class="player-label">P1</span>
                <span class="controls-hint">{{ p1ControlsHint }}</span>
            </div>
            <PlayerBoard 
                :game="duoGame.player1" 
                :showHold="true" 
                :showNext="true"
                playerColor="#00d4ff"
            />
            <div class="player-stats">
                <span class="score">{{ duoGame.player1.score.toLocaleString() }}</span>
                <span>L{{ duoGame.player1.level }} • {{ duoGame.player1.linesCleared }}</span>
                <div v-if="p1IsHighScore" class="record-badge">🏆 NEW RECORD!</div>
            </div>
        </div>
    </div>

    <!-- VS -->
    <div class="vs-section">
      <span class="vs-text">VS</span>
      
      <!-- Stats (Win Count) -->
      <div class="stats-container">
        <div class="stat-box p1-wins">
            <span class="stat-label">P1 WINS</span>
            <span class="stat-value">{{ stats.p1Wins }}</span>
        </div>
        <div class="stat-divider">-</div>
        <div class="stat-box p2-wins">
            <span class="stat-label">P2 WINS</span>
            <span class="stat-value">{{ stats.p2Wins }}</span>
        </div>
        <button class="reset-icon" @click="resetStats" title="Reset Wins">🗑️</button>
      </div>

      <!-- Winner Overlay -->
      <div v-if="duoGame.winner" class="winner-overlay">
        <span class="winner-text">🏆 P{{ duoGame.winner }} WINS!</span>

        <!-- Match Result Save Form -->
        <div class="match-save-section">
            <div v-if="matchSaved" class="saved-group">
                <div class="saved-msg">✅ Match Saved</div>
                <button @click="emit('show-leaderboard')" class="view-leaderboard-btn">🏆 View Leaderboard</button>
            </div>
            <div v-else class="save-form">
                <div class="player-inputs">
                    <input v-model="p1Name" placeholder="P1 Name" class="hs-input p1-in" />
                    <span class="vs-label">vs</span>
                    <input v-model="p2Name" placeholder="P2 Name" class="hs-input p2-in" />
                </div>
                <button @click="saveMatch" class="save-match-btn">💾 Save Result</button>
            </div>
        </div>


        <button @click="emit('restart')" class="restart-btn">🔄 Rematch</button>
      </div>

      <!-- Pause Indicator -->
      <div v-if="duoGame.isPaused && !duoGame.winner" class="pause-text">⏸️</div>
      
      <button @click="emit('back')" class="back-btn">← Menu</button>
    </div>

    <!-- Player 2 Board -->
    <div class="player-touch-wrapper p2-touch-zone"
         @touchstart="p2Controls.handleTouchStart" 
         @touchmove="p2Controls.handleTouchMove" 
         @touchend="p2Controls.handleTouchEnd">
         
        <div class="player-section">
            <div class="player-header p2">
                <span class="player-label">P2</span>
                <span class="controls-hint">{{ p2ControlsHint }}</span>
            </div>
            <PlayerBoard 
                :game="duoGame.player2" 
                :showHold="true" 
                :showNext="true"
                playerColor="#ff6b6b"
            />
            <div class="player-stats">
                <span class="score">{{ duoGame.player2.score.toLocaleString() }}</span>
                <span>L{{ duoGame.player2.level }} • {{ duoGame.player2.linesCleared }}</span>
                <div v-if="p2IsHighScore" class="record-badge">NEW HIGH SCORE!</div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { DuoGame } from '~/game/DuoGame'
import PlayerBoard from '~/components/PlayerBoard.vue'
import { DuoStatsService } from '~/services/DuoStatsService'
import { LeaderboardService } from '~/services/LeaderboardService'
import { useTouchControls } from '~/composables/useTouchControls'
import { GameAction } from '~/game/InputHandler'

const props = defineProps<{
  duoGame: DuoGame
}>()

const emit = defineEmits(['restart', 'back', 'show-leaderboard'])

// Detect mobile device for controls hint
const isMobile = computed(() => {
    if (typeof navigator === 'undefined') return false
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
})

// Controls hint text based on device (P1 and P2 have different zones)
const p1ControlsHint = computed(() => {
    return isMobile.value ? 'Swipe ←→↑↓' : 'WASD + Q/E'
})

const p2ControlsHint = computed(() => {
    return isMobile.value ? 'Swipe ←→↑↓' : '←→↓↑ + ,/.'
})

const p1Controls = useTouchControls(
    () => props.duoGame.player1,
    {
        checkPause: false, 
        customAction: (action: GameAction) => {
            if (props.duoGame.isPaused || props.duoGame.winner) return
            
            switch (action) {
                case GameAction.MOVE_LEFT:
                    props.duoGame.p1MoveLeft()
                    break
                case GameAction.MOVE_RIGHT:
                    props.duoGame.p1MoveRight()
                    break
                case GameAction.ROTATE_CW:
                    props.duoGame.p1Rotate()
                    break
                case GameAction.SOFT_DROP:
                    props.duoGame.p1MoveDown()
                    break
                case GameAction.HARD_DROP:
                    props.duoGame.p1HardDrop()
                    break
                case GameAction.HOLD:
                    props.duoGame.p1Hold()
                    break
                case GameAction.PAUSE:
                    props.duoGame.togglePause()
                    break
            }
        }
    }
)

const p2Controls = useTouchControls(
    () => props.duoGame.player2,
    {
        checkPause: false,
        customAction: (action: GameAction) => {
            if (props.duoGame.isPaused || props.duoGame.winner) return
            
            switch (action) {
                case GameAction.MOVE_LEFT:
                    props.duoGame.p2MoveLeft()
                    break
                case GameAction.MOVE_RIGHT:
                    props.duoGame.p2MoveRight()
                    break
                case GameAction.ROTATE_CW:
                    props.duoGame.p2Rotate()
                    break
                case GameAction.SOFT_DROP:
                    props.duoGame.p2MoveDown()
                    break
                case GameAction.HARD_DROP:
                    props.duoGame.p2HardDrop()
                    break
                case GameAction.HOLD:
                    props.duoGame.p2Hold()
                    break
                case GameAction.PAUSE:
                    props.duoGame.togglePause()
                    break
            }
        }
    }
)

// Stats
const stats = ref({ p1Wins: 0, p2Wins: 0 })

// Match Save State
const p1Name = ref('')
const p2Name = ref('')
const matchSaved = ref(false)
const p1IsHighScore = ref(false) // Just visual feedback
const p2IsHighScore = ref(false) // Just visual feedback

const P1_NAME_KEY = 'tetris-p1-name'
const P2_NAME_KEY = 'tetris-p2-name'

onMounted(() => {
    stats.value = DuoStatsService.getStats()
    if (typeof localStorage !== 'undefined') {
        p1Name.value = localStorage.getItem(P1_NAME_KEY) || 'Player 1'
        p2Name.value = localStorage.getItem(P2_NAME_KEY) || 'Player 2'
    }
})

// Watch Winner
watch(() => props.duoGame.winner, (winner) => {
    if (winner) {
        // Increment Win Count
        stats.value = DuoStatsService.incrementWin(winner as 1 | 2)
        matchSaved.value = false
        
        // Visual feedback
        p1IsHighScore.value = LeaderboardService.isHighScore(props.duoGame.player1.score, 'solo') 
        p2IsHighScore.value = LeaderboardService.isHighScore(props.duoGame.player2.score, 'solo')
    } else {
        matchSaved.value = false
        p1IsHighScore.value = false
        p2IsHighScore.value = false
    }
})

const saveMatch = () => {
    if (!p1Name.value.trim() || !p2Name.value.trim()) return

    // Save names for future
    localStorage.setItem(P1_NAME_KEY, p1Name.value.trim())
    localStorage.setItem(P2_NAME_KEY, p2Name.value.trim())
    
    LeaderboardService.addDuoMatch({
        date: new Date().toISOString(),
        winner: props.duoGame.winner === 1 ? 'p1' : 'p2',
        p1: { name: p1Name.value.trim(), score: props.duoGame.player1.score },
        p2: { name: p2Name.value.trim(), score: props.duoGame.player2.score }
    })
    
    matchSaved.value = true
}

const resetStats = () => {
    if (confirm('Reset win counts?')) {
        stats.value = DuoStatsService.resetStats()
    }
}
</script>

<style scoped>
/* Main Container - Full Screen */
.duo-area {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  width: 100%;
  height: 100vh; /* Full viewport height */
  overflow: hidden; /* Prevent scrolling */
  position: relative;
  background: #0d1117; /* Ensure background covers full screen */
  touch-action: none; /* Disable browser gestures */
}

/* Touch Zones - Grow to fill space */
.player-touch-wrapper {
  flex: 1; /* Take up all available space */
  display: flex;
  flex-direction: column;
  justify-content: center; /* Center board vertically */
  align-items: center;     /* Center board horizontally */
  height: 100%;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  z-index: 1; /* Base layer */
}

/* Visual Feedback for Touch Zones (optional, subtle) */
.player-touch-wrapper:active {
  background: rgba(255, 255, 255, 0.02);
}

.player-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  pointer-events: none; /* Clicks pass through to wrapper */
  z-index: 2; /* Content above background */
  padding: 1rem; /* Visual padding for the board itself */
}

/* VS Section - Middle Column */
.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 80px; /* Fixed narrow width */
  z-index: 10; /* Above players */
  background: rgba(0,0,0,0.2);
  height: 100%;
}

.vs-text {
  font-size: 2rem; /* Smaller to fit narrow column */
  font-weight: 900;
  background: linear-gradient(to bottom, #fff, #999);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}

.player-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.player-label {
  font-size: 1.5rem;
  font-weight: bold;
}

.p1 .player-label { color: #00d4ff; }
.p2 .player-label { color: #ff6b6b; }

.controls-hint {
  display: none; /* Hide hints in touch mode to clean up UI? Or keep small? */
}

/* Show hints only on larger screens or make them small transparent */
@media (min-width: 1024px) {
    .controls-hint {
        display: block;
        font-size: 0.8rem;
        color: #888;
        background: rgba(0,0,0,0.3);
        padding: 0.2rem 0.6rem;
        border-radius: 10px;
    }
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: monospace;
  align-items: center;
  text-align: center;
}

.score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
}

/* Winner Overlay - Centered on screen */
.winner-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.95);
  padding: 2rem;
  border-radius: 16px;
  border: 2px solid #ffd700;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
  z-index: 100;
  min-width: 300px;
  box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
  backdrop-filter: blur(10px);
}

.winner-text {
  font-size: 2.5rem;
  font-weight: bold;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  white-space: nowrap;
  animation: bounce 1s infinite alternate;
}

/* Stats Section in Middle */
.stats-container {
    display: flex;
    flex-direction: column; /* Stack vertically in narrow column */
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    padding: 0;
    border: none;
    margin-bottom: 0;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
}

.stat-label {
    font-size: 0.6rem;
    color: #888;
    font-weight: bold;
}

.stat-value {
    font-size: 1.2rem;
    font-weight: 900;
    line-height: 1;
}

.p1-wins .stat-value { color: #00d4ff; }
.p2-wins .stat-value { color: #ff6b6b; }

.stat-divider {
    display: none; /* Hide divider in vertical stack */
}

.reset-icon {
    font-size: 1rem;
    opacity: 0.3;
}

.pause-text {
  font-size: 2rem;
  animation: pulse 1s infinite;
  color: white;
}

.back-btn {
  background: transparent;
  border: 1px solid #444;
  color: #888;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
}

/* Animations */
@keyframes bounce {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Helper for save form - keep it usable */
.match-save-section {
    width: 100%;
}
.save-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
}
.player-inputs {
    justify-content: center;
}
.hs-input {
    background: rgba(255,255,255,0.1);
    border: none;
    padding: 0.5rem;
    color: white;
    text-align: center;
    width: 120px;
}
.save-match-btn, .restart-btn, .view-leaderboard-btn {
    padding: 0.8rem;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    border: none;
    width: 100%;
}
.save-match-btn { background: #00ff88; color: black; }
.restart-btn { background: #00d4ff; color: white; }
.view-leaderboard-btn { background: #ffd700; color: black; }

.reset-icon {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s, transform 0.2s;
    margin-left: 0.5rem;
    padding: 0.5rem;
    border-radius: 50%;
}

.reset-icon:hover {
    opacity: 1;
    transform: scale(1.1);
    background: rgba(255, 255, 255, 0.1);
}

.saved-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
}

.view-leaderboard-btn {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    color: #1a1a1a;
    border: none;
    padding: 0.8rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    border-radius: 6px;
    cursor: pointer;
    width: 100%;
    margin-bottom: 1rem;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
    transition: transform 0.2s;
}

.view-leaderboard-btn:hover {
    transform: scale(1.05);
}
</style>
