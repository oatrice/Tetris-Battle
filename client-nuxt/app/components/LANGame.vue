<template>
  <div class="lan-area">
    <!-- Step 1: Choose Host or Join -->
    <div v-if="step === 'choose'" class="lan-menu">
      <h2>📡 LAN Mode</h2>
      <p class="lan-desc">เล่นกับเพื่อนบน WiFi/Hotspot เดียวกัน</p>
      
      <div class="lan-buttons">
        <button @click="showHostInstructions" class="lan-btn host">
          🖥️ Host Game
          <span class="btn-hint">รัน Server บนเครื่องนี้</span>
        </button>
        <button @click="step = 'join'" class="lan-btn join">
          📱 Join Game
          <span class="btn-hint">เชื่อมต่อกับ Host</span>
        </button>
      </div>
      
      <button @click="emit('back')" class="back-btn">← Back</button>
    </div>

    <!-- Step 2a: Host Instructions -->
    <div v-if="step === 'host'" class="lan-panel">
      <h2>🖥️ Host Game</h2>
      
      <div class="instructions">
        <p>1. รัน Go Server บนเครื่องนี้:</p>
        <code class="code-block">./tetris-server</code>
        
        <p>2. แจ้ง IP ให้เพื่อน:</p>
        <div class="ip-display">
          <span class="ip-label">Your IP:</span>
          <span class="ip-value">{{ localIP }}:8080</span>
          <button @click="copyIP" class="copy-btn">📋</button>
        </div>
        
        <p>3. กด Join เมื่อ Server พร้อม:</p>
        <button @click="joinAsHost" class="start-btn" :disabled="connecting">
          {{ connecting ? 'Connecting...' : '▶️ Start & Join' }}
        </button>
      </div>
      
      <div v-if="error" class="error-msg">{{ error }}</div>
      <button @click="step = 'choose'" class="back-btn">← Back</button>
    </div>

    <!-- Step 2b: Join Game -->
    <div v-if="step === 'join'" class="lan-panel">
      <h2>📱 Join Game</h2>
      
      <div class="join-form">
        <label>Enter Host IP:</label>
        <div class="ip-input-group">
          <input 
            v-model="hostIP" 
            type="text" 
            placeholder="192.168.x.x" 
            @keyup.enter="joinGame"
          />
          <span class="port-label">:8080</span>
        </div>
        
        <button @click="joinGame" class="start-btn" :disabled="!hostIP || connecting">
          {{ connecting ? 'Connecting...' : '▶️ Connect' }}
        </button>
      </div>
      
      <div v-if="error" class="error-msg">{{ error }}</div>
      <button @click="step = 'choose'" class="back-btn">← Back</button>
    </div>

    <!-- Step 3: Game (reuse OnlineGame component) -->
    <div v-if="step === 'playing' && lanGame" class="game-container">
      <OnlineGameComponent :onlineGame="lanGame" @back="leaveGame" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, reactive } from 'vue'
import { OnlineGame } from '~/game/OnlineGame'

const OnlineGameComponent = defineAsyncComponent(() => import('./OnlineGame.vue'))

const emit = defineEmits(['back'])

type Step = 'choose' | 'host' | 'join' | 'playing'

const step = ref<Step>('choose')
const hostIP = ref('')
const localIP = ref('192.168.x.x')
const connecting = ref(false)
const error = ref('')
const lanGame = ref<OnlineGame | null>(null)

// Try to detect local IP (best effort)
const detectLocalIP = () => {
  // This is a hint - actual IP detection in browser is limited
  // On most hotspots, host is 192.168.43.1
  localIP.value = '192.168.43.1'
}

const showHostInstructions = () => {
  detectLocalIP()
  step.value = 'host'
}

const copyIP = () => {
  navigator.clipboard.writeText(`${localIP.value}:8080`)
}

const buildWsUrl = (ip: string) => {
  return `ws://${ip}:8080/ws`
}

const joinAsHost = async () => {
  await connectToServer(localIP.value)
}

const joinGame = async () => {
  if (!hostIP.value) return
  await connectToServer(hostIP.value)
}

const connectToServer = async (ip: string) => {
  connecting.value = true
  error.value = ''
  
  try {
    const wsUrl = buildWsUrl(ip)
    const game = reactive(new OnlineGame()) as OnlineGame
    game.init(wsUrl)
    
    // Wait a bit for connection
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    lanGame.value = game
    step.value = 'playing'
  } catch (e: any) {
    error.value = `Connection failed: ${e.message || 'Unknown error'}`
  } finally {
    connecting.value = false
  }
}

const leaveGame = () => {
  if (lanGame.value) {
    lanGame.value.cleanup()
    lanGame.value = null
  }
  step.value = 'choose'
  emit('back')
}
</script>

<style scoped>
.lan-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  min-height: 400px;
}

.lan-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.lan-desc {
  color: #888;
  font-size: 0.9rem;
}

.lan-buttons {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.lan-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem 2rem;
  border: none;
  border-radius: 16px;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  min-width: 160px;
}

.lan-btn.host {
  background: linear-gradient(135deg, #00b4db, #0083b0);
  color: white;
}

.lan-btn.join {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: white;
}

.lan-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.btn-hint {
  font-size: 0.75rem;
  font-weight: normal;
  opacity: 0.8;
}

.lan-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 400px;
}

.instructions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: rgba(255,255,255,0.05);
  padding: 1.5rem;
  border-radius: 12px;
  width: 100%;
}

.instructions p {
  margin: 0;
  color: #ccc;
}

.code-block {
  background: #0a0a1a;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-family: monospace;
  color: #00ff88;
  display: block;
}

.ip-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0a0a1a;
  padding: 0.75rem 1rem;
  border-radius: 6px;
}

.ip-label {
  color: #888;
}

.ip-value {
  color: #ffd700;
  font-weight: bold;
  font-family: monospace;
  font-size: 1.1rem;
}

.copy-btn {
  background: transparent;
  border: 1px solid #444;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.join-form label {
  color: #ccc;
}

.ip-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ip-input-group input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #444;
  border-radius: 6px;
  background: #0a0a1a;
  color: white;
  font-size: 1rem;
  font-family: monospace;
}

.port-label {
  color: #888;
  font-family: monospace;
}

.start-btn {
  background: linear-gradient(135deg, #00ff88, #00cc6a);
  color: #004400;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;
}

.start-btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-btn {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1rem;
}

.back-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.error-msg {
  color: #ff6b6b;
  background: rgba(255,107,107,0.1);
  padding: 0.75rem;
  border-radius: 6px;
  width: 100%;
  text-align: center;
}

.game-container {
  width: 100%;
}
</style>
