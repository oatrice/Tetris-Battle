<template>
  <div class="leaderboard-overlay" @click.self="$emit('close')">
    <div class="leaderboard-modal">
      <h2>🏆 Leaderboard</h2>
      
      <!-- Mode Tabs -->
      <!-- Mode Tabs -->
      <div class="mode-tabs">
        <button 
          :class="['tab', { active: activeTab === 'solo' }]" 
          @click="activeTab = 'solo'"
        >
          🎯 Solo
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
      </div>
      
      <div v-if="entries.length === 0 && activeTab !== 'duo'" class="empty-state">
        <p>ยังไม่มีสถิติ</p>
        <p class="hint">เล่น {{ activeTab === 'solo' ? 'Solo' : 'Special' }} mode เพื่อบันทึกคะแนน!</p>
      </div>

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

      <table v-else class="leaderboard-table">
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
            <td class="name">{{ entry.playerName }}</td>
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
import { ref, computed } from 'vue'
import { LeaderboardService, type LeaderboardEntry, type GameMode, type DuoMatchResult } from '~/services/LeaderboardService'

const props = defineProps<{
  highlightRank?: number
  highlightMode?: GameMode
  initialTab?: GameMode
}>()

defineEmits(['close'])

const activeTab = ref<GameMode>(props.initialTab ?? 'solo')

const entries = computed<LeaderboardEntry[]>(() => {
    if (activeTab.value === 'duo') return []
    return LeaderboardService.getLeaderboard(activeTab.value)
})

const duoSessions = computed<DuoMatchResult[]>(() => {
    if (activeTab.value !== 'duo') return []
    return LeaderboardService.getDuoLeaderboard()
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
  z-index: 100;
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
  margin-bottom: 1rem;
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
    justify-content: space-between;
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.3rem;
}

.match-id { font-weight: bold; color: #aaa; }
.match-date { font-style: italic; }

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
</style>
