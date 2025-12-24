<template>
  <div class="duo-area">
    <!-- Player 1 Board -->
    <div class="player-section">
      <div class="player-header p1">
        <span class="player-label">P1</span>
        <span class="controls-hint">WASD + Q/E</span>
      </div>
      <PlayerBoard 
        :game="duoGame.player1" 
        :showHold="true" 
        :showNext="true"
        playerColor="#00d4ff"
      />
      <div class="player-stats">
        <span class="score">{{ duoGame.player1.score }}</span>
        <span>L{{ duoGame.player1.level }} • {{ duoGame.player1.linesCleared }}</span>
        <div v-if="p1IsHighScore" class="record-badge">🏆 NEW RECORD!</div>
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
      </div>

      <!-- Winner Overlay -->
      <div v-if="duoGame.winner" class="winner-overlay">
        <span class="winner-text">🏆 P{{ duoGame.winner }} WINS!</span>

        <!-- High Score Forms -->
        <div class="high-score-section">
            <div v-if="p1IsHighScore" class="hs-form p1-form">
                <span class="hs-title">P1 Record!</span>
                <div v-if="p1Saved" class="saved-msg">✅ {{ p1Name }}</div>
                <div v-else class="input-group">
                    <input v-model="p1Name" placeholder="P1 Name" class="hs-input" @keyup.enter="saveP1" />
                    <button @click="saveP1">💾</button>
                </div>
            </div>

            <div v-if="p2IsHighScore" class="hs-form p2-form">
                <span class="hs-title">P2 Record!</span>
                <div v-if="p2Saved" class="saved-msg">✅ {{ p2Name }}</div>
                <div v-else class="input-group">
                    <input v-model="p2Name" placeholder="P2 Name" class="hs-input" @keyup.enter="saveP2" />
                    <button @click="saveP2">💾</button>
                </div>
            </div>
        </div>

        <button @click="emit('restart')" class="restart-btn">🔄 Rematch</button>
      </div>

      <!-- Pause Indicator -->
      <div v-if="duoGame.isPaused && !duoGame.winner" class="pause-text">⏸️</div>
      
      <button @click="emit('back')" class="back-btn">← Menu</button>
    </div>

    <!-- Player 2 Board -->
    <div class="player-section">
      <div class="player-header p2">
        <span class="player-label">P2</span>
        <span class="controls-hint">←→↓↑ + ,/.</span>
      </div>
      <PlayerBoard 
        :game="duoGame.player2" 
        :showHold="true" 
        :showNext="true"
        playerColor="#ff6b6b"
      />
      <div class="player-stats">
        <span class="score">{{ duoGame.player2.score }}</span>
        <span>L{{ duoGame.player2.level }} • {{ duoGame.player2.linesCleared }}</span>
        <div v-if="p2IsHighScore" class="record-badge">🏆 NEW RECORD!</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { DuoGame } from '~/game/DuoGame'
import PlayerBoard from '~/components/PlayerBoard.vue'
import { DuoStatsService } from '~/services/DuoStatsService'
import { LeaderboardService } from '~/services/LeaderboardService'

const props = defineProps<{
  duoGame: DuoGame
}>()

const emit = defineEmits(['restart', 'back'])

// Stats
const stats = ref({ p1Wins: 0, p2Wins: 0 })

// High Score State
const p1IsHighScore = ref(false)
const p2IsHighScore = ref(false)
const p1Name = ref('')
const p2Name = ref('')
const p1Saved = ref(false)
const p2Saved = ref(false)

const P1_NAME_KEY = 'tetris-p1-name'
const P2_NAME_KEY = 'tetris-p2-name'

onMounted(() => {
    stats.value = DuoStatsService.getStats()
    if (typeof localStorage !== 'undefined') {
        p1Name.value = localStorage.getItem(P1_NAME_KEY) || ''
        p2Name.value = localStorage.getItem(P2_NAME_KEY) || ''
    }
})

// Watch Winner
watch(() => props.duoGame.winner, (winner) => {
    if (winner) {
        // Increment Win Count
        stats.value = DuoStatsService.incrementWin(winner as 1 | 2)

        // Check High Scores
        checkHighScores()
    } else {
        // Reset states on restart
        p1IsHighScore.value = false
        p2IsHighScore.value = false
        p1Saved.value = false
        p2Saved.value = false
    }
})

const checkHighScores = () => {
    // Check P1
    if (LeaderboardService.isHighScore(props.duoGame.player1.score, 'duo')) {
        p1IsHighScore.value = true
        // Auto-save if name exists
        if (p1Name.value) saveP1()
    }

    // Check P2
    if (LeaderboardService.isHighScore(props.duoGame.player2.score, 'duo')) {
        p2IsHighScore.value = true
        // Auto-save if name exists
        if (p2Name.value) saveP2()
    }
}

const saveP1 = () => {
    if (!p1Name.value.trim()) return
    localStorage.setItem(P1_NAME_KEY, p1Name.value.trim())
    
    LeaderboardService.addScore({
        playerName: p1Name.value.trim(),
        score: props.duoGame.player1.score,
        level: props.duoGame.player1.level,
        lines: props.duoGame.player1.linesCleared,
        date: new Date().toISOString()
    }, 'duo')
    
    p1Saved.value = true
}

const saveP2 = () => {
    if (!p2Name.value.trim()) return
    localStorage.setItem(P2_NAME_KEY, p2Name.value.trim())
    
    LeaderboardService.addScore({
        playerName: p2Name.value.trim(),
        score: props.duoGame.player2.score,
        level: props.duoGame.player2.level,
        lines: props.duoGame.player2.linesCleared,
        date: new Date().toISOString()
    }, 'duo')
    
    p2Saved.value = true
}
</script>

<style scoped>
.duo-area {
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
  font-size: 0.8rem;
  color: #888;
  background: rgba(0,0,0,0.3);
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
}

.player-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: monospace;
}

.score {
  font-size: 1.5rem;
  font-weight: bold;
  color: #ffd700;
}

.vs-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 10rem; /* Push down to center between boards visually */
  position: relative;
}

.vs-text {
  font-size: 3rem;
  font-weight: 900;
  background: linear-gradient(to bottom, #fff, #999);
  -webkit-background-clip: text;
  color: transparent;
  font-style: italic;
}


/* Stats Section */
.stats-container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    background: rgba(0,0,0,0.4);
    padding: 0.8rem 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
}

.stat-label {
    font-size: 0.8rem;
    color: #888;
    font-weight: bold;
    letter-spacing: 1px;
}

.stat-value {
    font-size: 2rem;
    font-weight: 900;
    line-height: 1;
}

.p1-wins .stat-value { color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.4); }
.p2-wins .stat-value { color: #ff6b6b; text-shadow: 0 0 10px rgba(255, 107, 107, 0.4); }

.stat-divider {
    font-size: 1.5rem;
    color: #444;
}

/* High Score Form */
.high-score-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
}

.hs-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.8rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
}

.p1-form { border-left: 4px solid #00d4ff; }
.p2-form { border-left: 4px solid #ff6b6b; }

.hs-title {
    font-size: 1rem;
    font-weight: bold;
    color: #ffd700;
}

.input-group {
    display: flex;
    gap: 0.5rem;
}

.hs-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #666;
    color: white;
    padding: 0.4rem;
    border-radius: 4px;
    outline: none;
    font-size: 0.9rem;
}

.hs-input:focus {
    border-color: #ffd700;
}

.saved-msg {
    color: #00ff88;
    font-weight: bold;
    font-size: 0.9rem;
}

.record-badge {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 215, 0, 0.4);
    animation: pulse 2s infinite;
    margin-top: 0.5rem;
}

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

.pause-text {
  font-size: 3rem;
  animation: pulse 1s infinite;
}

.restart-btn {
  background: linear-gradient(135deg, #00d4ff, #0056b3);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s;
  width: 100%;
}

.restart-btn:hover {
  transform: scale(1.05);
}

.back-btn {
  background: transparent;
  border: 1px solid #666;
  color: #aaa;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

@keyframes bounce {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}
</style>
