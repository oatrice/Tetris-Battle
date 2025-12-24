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
          🎯 Solo
        </button>
        <button 
          :class="['tab', { active: activeTab === 'special' }]" 
          @click="activeTab = 'special'"
        >
          ✨ Special
        </button>
      </div>
      
      <div v-if="entries.length === 0" class="empty-state">
        <p>ยังไม่มีสถิติ</p>
        <p class="hint">เล่น {{ activeTab === 'solo' ? 'Solo' : 'Special' }} mode เพื่อบันทึกคะแนน!</p>
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
import { LeaderboardService, type LeaderboardEntry, type GameMode } from '~/services/LeaderboardService'

const props = defineProps<{
  highlightRank?: number
  highlightMode?: GameMode
  initialTab?: GameMode
}>()

defineEmits(['close'])

const activeTab = ref<GameMode>(props.initialTab ?? 'solo')
const entries = computed<LeaderboardEntry[]>(() => LeaderboardService.getLeaderboard(activeTab.value))
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
