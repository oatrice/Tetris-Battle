<template>
  <div class="leaderboard-overlay" @click.self="$emit('close')">
    <div class="leaderboard-modal">
      <h2>🏆 Leaderboard</h2>
      
      <!-- Mode Tabs -->
      <div class="mode-tabs">
        <button 
          :class="['tab', { active: activeTab === 'solo' }]" 
          @click="activeTab = 'solo'"
        >
          🎯 Normal
        </button>
        <button 
          :class="['tab', { active: activeTab === 'special' }]" 
          @click="activeTab = 'special'"
        >
          ✨ Special
        </button>
        <button 
          :class="['tab', { active: activeTab === 'duo' }]" 
          @click="activeTab = 'duo'"
        >
          👥 Duo
        </button>
        <button 
          :class="['tab', { active: activeTab === 'online' }]" 
          @click="activeTab = 'online'"
        >
          🌐 Online
        </button>
      </div>
      
      <!-- Source Switcher -->
      <div v-if="activeTab === 'solo' || activeTab === 'special'" class="source-switcher">
          <div class="switch-container">
            <button :class="{ active: dataSource === 'global' }" @click="dataSource = 'global'">🌍 Global</button>
            <button :class="{ active: dataSource === 'local' }" @click="dataSource = 'local'">💻 Local</button>
          </div>
      </div>
      
      <!-- Filters -->
      <div v-if="activeTab === 'solo' || activeTab === 'special'" class="filters">
        <button class="filter-btn" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">All</button>
        <button class="filter-btn" :class="{ active: filterType === 'normal' }" @click="filterType = 'normal'">🐢 Normal</button>
        <button class="filter-btn" :class="{ active: filterType === 'speed' }" @click="filterType = 'speed'">⚡ Speed Inc.</button>
      </div>
      
      <!-- Empty State for Solo/Special -->
      <div v-if="entries.length === 0 && (activeTab === 'solo' || activeTab === 'special')" class="empty-state">
        <p>ยังไม่มีสถิติ {{ filterType !== 'all' ? (filterType === 'speed' ? '(Speed Increase)' : '(Normal)') : '' }}</p>
        <p class="hint">เล่น {{ activeTab === 'solo' ? 'Normal' : 'Special' }} mode เพื่อบันทึกคะแนน!</p>
      </div>

      <!-- Duo Sessions -->
      <div v-else-if="activeTab === 'duo'" class="duo-container">
        <div v-if="duoSessions.length === 0" class="empty-state">
            <p>ยังไม่มีการแข่งขัน Duo</p>
            <p class="hint">เล่นกับเพื่อนแล้วบันทึกผลการแข่งขัน!</p>
        </div>
        <div v-else class="session-list">
            <div v-for="(session, index) in duoSessions" :key="session.id" class="session-card">
                <div class="session-header">
                    <span class="match-id">Match #{{ duoSessions.length - index }}</span>
                    <span class="match-date">{{ new Date(session.date).toLocaleString() }}</span>
                </div>
                <div class="session-players">
                    <!-- P1 -->
                    <div :class="['p-row', { winner: session.winner === 'p1' }]">
                        <span class="p-icon">{{ session.winner === 'p1' ? '👑' : '👤' }}</span>
                        <span class="p-name p1-text">{{ session.p1.name }}</span>
                        <span class="p-score">{{ session.p1.score.toLocaleString() }}</span>
                    </div>
                    <!-- P2 -->
                    <div :class="['p-row', { winner: session.winner === 'p2' }]">
                        <span class="p-icon">{{ session.winner === 'p2' ? '👑' : '👤' }}</span>
                        <span class="p-name p2-text">{{ session.p2.name }}</span>
                        <span class="p-score">{{ session.p2.score.toLocaleString() }}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Online Match History -->
      <div v-else-if="activeTab === 'online'" class="online-container">
        <div v-if="onlineMatches.length === 0" class="empty-state">
            <p>ยังไม่มีการแข่งขัน Online</p>
            <p class="hint">เล่น Online/LAN mode แล้วบันทึกผลการแข่งขัน!</p>
        </div>
        <div v-else class="session-list">
            <div v-for="(match, index) in onlineMatches" :key="match.id" class="session-card">
                <div class="session-header">
                    <div class="header-row top">
                        <div class="match-info">
                            <span class="match-number">{{ match.gameMode === 'lan' ? '📡' : '🌐' }} Match #{{ onlineMatches.length - index }}</span>
                            <span class="mode-badge" :class="match.gameMode">{{ match.gameMode?.toUpperCase() || 'ONLINE' }}</span>
                        </div>
                        <span class="match-date">{{ new Date(match.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
                    </div>
                    <div class="header-row bottom">
                         <span v-if="match.matchId" class="server-match-id" :title="match.matchId">
                            ID: {{ typeof match.matchId === 'string' ? match.matchId.slice(-6) : 'N/A' }}
                        </span>
                        <span class="match-duration" v-if="match.duration">⏱ {{ formatDuration(match.duration) }}</span>
                    </div>
                </div>
                <div class="online-result">
                    <!-- Result Badge -->
                    <div v-if="match.isDraw" class="result-badge draw">
                        🤝 DRAW
                    </div>
                    <div v-else-if="match.isWinner" class="result-badge win">
                        🏆 WIN
                    </div>
                    <div v-else class="result-badge lose">
                        ❌ LOSE
                    </div>
                    
                    <!-- Player -->
                    <div class="online-player">
                        <span class="player-label">You:</span>
                        <span class="player-name">{{ match.playerName }}</span>
                    </div>
                    
                    <!-- Scores -->
                    <div v-if="match.isWinner" class="score-info">
                        <div class="score-row">
                            <span class="score-label">Win Score:</span>
                            <span class="score-value gold">{{ match.winScore?.toLocaleString() ?? '-' }}</span>
                        </div>
                        <div v-if="match.maxScore > (match.winScore ?? 0)" class="score-row">
                            <span class="score-label">Max Score:</span>
                            <span class="score-value green">{{ match.maxScore.toLocaleString() }}</span>
                        </div>
                    </div>
                    <div v-else class="score-info">
                        <div class="score-row">
                            <span class="score-label">Your Score:</span>
                            <span class="score-value">{{ match.maxScore.toLocaleString() }}</span>
                        </div>
                    </div>
                    
                    <!-- Opponent -->
                    <div class="opponent-info">
                        <span class="vs-text">vs</span>
                        <span class="opponent-name">{{ match.opponentName }}</span>
                        <span class="opponent-score">({{ match.opponentScore.toLocaleString() }})</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading Global Data...</p>
      </div>

      <table v-else-if="activeTab === 'solo' || activeTab === 'special'" class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Score</th>
            <th>Lv</th>
            <th>Lines</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(entry, index) in entries" 
            :key="index"
            :class="{ highlight: highlightRank === index + 1 && highlightMode === activeTab, 'top-three': index < 3 }"
          >
            <td class="rank">
              <span v-if="index === 0">🥇</span>
              <span v-else-if="index === 1">🥈</span>
              <span v-else-if="index === 2">🥉</span>
              <span v-else>{{ index + 1 }}</span>
            </td>
            <td class="name">
              {{ entry.playerName }}
              <span v-if="entry.hasIncreaseGravity" title="Played with Speed Increase" class="speed-icon">⚡</span>
            </td>
            <td class="score">{{ entry.score.toLocaleString() }}</td>
            <td class="level">{{ entry.level }}</td>
            <td class="lines">{{ entry.lines }}</td>
          </tr>
        </tbody>
      </table>

      <div class="actions">
        <button @click="$emit('close')" class="close-btn">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LeaderboardService, type LeaderboardEntry, type GameMode, type DuoMatchResult, type OnlineMatchResult } from '~/services/LeaderboardService'

const props = defineProps<{
  initialMode?: GameMode
  highlightRank?: number
  highlightMode?: GameMode
  initialTab?: GameMode
}>()

defineEmits(['close'])

const formatDuration = (seconds?: number) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}



const activeTab = ref<GameMode>(props.initialTab ?? 'solo')
const filterType = ref<'all' | 'speed' | 'normal'>('all')
const dataSource = ref<'local' | 'global'>('global') // Default to global
const globalEntries = ref<LeaderboardEntry[]>([])
const isLoading = ref(false)

// Watchers to fetch data when tab/filter/source changes
watch([activeTab, filterType, dataSource], async ([newTab, newFilter, newSource]) => {
    if (newSource === 'global' && (newTab === 'solo' || newTab === 'special')) {
        isLoading.value = true
        globalEntries.value = await LeaderboardService.fetchGlobalLeaderboard(newTab, newFilter)
        isLoading.value = false
    }
}, { immediate: true })

const entries = computed<LeaderboardEntry[]>(() => {
    if (activeTab.value === 'duo' || activeTab.value === 'online') return []
    
    // Global Mode
    if (dataSource.value === 'global') {
        return globalEntries.value
    }

    // Local Mode
    let list = LeaderboardService.getLeaderboard(activeTab.value)
    
    if (filterType.value === 'speed') {
        list = list.filter(e => e.hasIncreaseGravity)
    } else if (filterType.value === 'normal') {
        list = list.filter(e => !e.hasIncreaseGravity)
    }
    
    return list
})

const duoSessions = computed<DuoMatchResult[]>(() => {
    if (activeTab.value !== 'duo') return []
    return LeaderboardService.getDuoLeaderboard()
})

const onlineMatches = computed<OnlineMatchResult[]>(() => {
    if (activeTab.value !== 'online') return []
    return LeaderboardService.getOnlineLeaderboard()
})
</script>

<style scoped>
.leaderboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.leaderboard-modal {
  background: linear-gradient(135deg, #16213e, #1a1a2e);
  border: 2px solid rgba(157, 78, 221, 0.5);
  border-radius: 16px;
  padding: 1.5rem;
  min-width: 380px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

h2 {
  margin: 0 0 1rem;
  color: #ffd700;
  text-align: center;
  font-size: 1.5rem;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.mode-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.filters {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
    gap: 0.5rem;
}

.filter-btn {
    font-size: 0.75rem;
    color: #aaa;
    cursor: pointer;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    transition: all 0.2s;
    min-width: 60px;
}

.filter-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.filter-btn.active {
    background: rgba(255, 215, 0, 0.15);
    border-color: #ffd700;
    color: #ffd700;
    font-weight: bold;
}

.tab {
  flex: 1;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.05);
  color: #888;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

/* Duo Session View */
.duo-container {
    overflow-y: auto;
    max-height: 400px;
    padding-right: 0.5rem;
}

.session-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 0.8rem;
    margin-bottom: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.session-header {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.3rem;
}

.header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header-row.top {
    font-size: 0.85rem;
    font-weight: bold;
    color: #e0e0e0;
}

.header-row.bottom {
    font-size: 0.75rem;
    color: #888;
}

.match-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.match-number {
    color: #fff;
    font-weight: bold;
}

.match-id {
    color: #fff;
    font-weight: bold;
}

.match-date {
    font-style: normal;
    font-size: 0.75rem;
    color: #aaa;
}

.server-match-id {
    font-family: monospace;
    font-size: 0.7rem;
    color: #666;
    background: rgba(0,0,0,0.2);
    padding: 0 4px;
    border-radius: 4px;
}

.mode-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-weight: bold;
    text-transform: uppercase;
}

.mode-badge.online {
    background: rgba(102, 126, 234, 0.3);
    color: #667eea;
}

.mode-badge.lan {
    background: rgba(0, 212, 255, 0.3);
    color: #00d4ff;
}

.session-players {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.p-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
}

.p-row.winner {
    background: rgba(255, 215, 0, 0.15);
    border: 1px solid rgba(255, 215, 0, 0.3);
}

.p-icon { font-size: 1.2rem; min-width: 1.5rem; text-align: center; }

.p-name { flex: 1; font-weight: bold; }
.p1-text { color: #00d4ff; }
.p2-text { color: #ff6b6b; }

.p-score { font-family: monospace; font-size: 1.1rem; color: #eee; }

.winner .p-score { color: #ffd700; font-weight: bold; }

/* Online Match Styles */
.online-container {
    overflow-y: auto;
    max-height: 400px;
    padding-right: 0.5rem;
}

.online-result {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.result-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 1rem;
    text-align: center;
}

.result-badge.win {
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.4);
}

.result-badge.lose {
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
    border: 1px solid rgba(255, 107, 107, 0.4);
}

.result-badge.draw {
    background: rgba(0, 212, 255, 0.2);
    color: #00d4ff;
    border: 1px solid rgba(0, 212, 255, 0.4);
}

.online-player {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.player-label {
    color: #888;
    font-size: 0.85rem;
}

.player-name {
    color: #00d4ff;
    font-weight: bold;
}

.score-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding-left: 1rem;
}

.score-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.9rem;
}

.score-label {
    color: #888;
}

.score-value {
    font-family: monospace;
    color: #eee;
}

.score-value.gold {
    color: #ffd700;
    font-weight: bold;
}

.score-value.green {
    color: #00ff88;
}

.opponent-info {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.3rem;
    padding-top: 0.3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.vs-text {
    color: #666;
    font-style: italic;
}

.opponent-name {
    color: #ff6b6b;
}

.opponent-score {
    color: #888;
    font-family: monospace;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #bbb;
}

.tab.active {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-color: transparent;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #888;
}

.empty-state .hint {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
}

.leaderboard-table th {
  color: #9d4edd;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(157, 78, 221, 0.3);
}

.leaderboard-table td {
  padding: 0.6rem 0.5rem;
  text-align: center;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.leaderboard-table tr.top-three {
  font-weight: bold;
}

.leaderboard-table tr.highlight {
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.2), rgba(157, 78, 221, 0.2));
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.rank {
  font-size: 1.1rem;
  width: 40px;
}

.name {
  text-align: left !important;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score {
  color: #00d4ff;
  font-weight: bold;
}

.level, .lines {
  color: #aaa;
  font-size: 0.9rem;
}

.source-switcher {
    display: flex;
    justify-content: center;
    margin-bottom: 0.8rem;
}

.switch-container {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 20px;
    padding: 4px;
    display: flex;
    gap: 4px;
}

.switch-container button {
    background: transparent;
    border: none;
    color: #888;
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    cursor: pointer;
    border-radius: 16px;
    transition: all 0.2s;
}

.switch-container button.active {
    background: linear-gradient(135deg, #00d4ff, #005aff);
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(0, 212, 255, 0.3);
}

.actions {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
}

.close-btn {
  padding: 0.6rem 2rem;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.close-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
}

.speed-icon {
  font-size: 0.8rem;
  margin-left: 4px;
  color: #ffd700;
  vertical-align: middle;
}
</style>
