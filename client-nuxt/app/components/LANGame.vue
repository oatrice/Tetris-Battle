<template>
  <div class="lan-area">
    <!-- Step 1: Choose Host or Join -->
    <div v-if="!connected" class="lan-menu">
      <h2>📡 LAN Mode</h2>
      <p class="lan-desc">เล่นกับเพื่อนบน WiFi/Hotspot เดียวกัน</p>
      
      <div v-if="step === 'choose'" class="lan-buttons">
        <button @click="showHostInstructions" class="lan-btn host">
          🖥️ Host Game
          <span class="btn-hint">รัน Server บนเครื่องนี้</span>
        </button>
        <button @click="step = 'join'" class="lan-btn join">
          📱 Join Game
          <span class="btn-hint">เชื่อมต่อกับ Host</span>
        </button>
      </div>

      <!-- Host Instructions -->
      <div v-else-if="step === 'host'" class="lan-panel">
        <div class="instructions">
          <p>1. รัน Go Server บนเครื่องนี้:</p>
          <code class="code-block">./tetris-server</code>
          
          <p>2. ตั้งค่า Server IP:</p>
          <div class="ip-input-group">
            <input 
              v-model="serverIP" 
              type="text" 
              placeholder="localhost"
            />
            <span class="port-label">:8080</span>
            <button @click="copyIP" class="copy-btn" title="Copy">📋</button>
          </div>
          <div class="ip-presets">
            <button @click="serverIP = 'localhost'" :class="{ active: serverIP === 'localhost' }" class="preset-btn">💻 PC</button>
            <button @click="serverIP = '192.168.43.1'" :class="{ active: serverIP === '192.168.43.1' }" class="preset-btn">📱 Hotspot</button>
          </div>
          
          <p>3. กด Join เมื่อ Server พร้อม:</p>
          <button @click="connectToLAN" class="start-btn" :disabled="connecting || !serverIP">
            {{ connecting ? 'Connecting...' : '▶️ Start & Join' }}
          </button>
        </div>
        
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button @click="step = 'choose'" class="back-btn">← Back</button>
      </div>

      <!-- Join Form -->
      <div v-else-if="step === 'join'" class="lan-panel">
        <div class="join-form">
          <label>Enter Host IP:</label>
          <div class="ip-input-group">
            <input 
              v-model="serverIP" 
              type="text" 
              placeholder="192.168.x.x" 
              @keyup.enter="connectToLAN"
            />
            <span class="port-label">:8080</span>
          </div>
          
          <button @click="connectToLAN" class="start-btn" :disabled="!serverIP || connecting">
            {{ connecting ? 'Connecting...' : '▶️ Connect' }}
          </button>
        </div>
        
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button @click="step = 'choose'" class="back-btn">← Back</button>
      </div>
      
      <button v-if="step === 'choose'" @click="emit('back')" class="back-btn">← Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'connect', wsUrl: string): void
}>()

defineProps<{
  connected: boolean
}>()

type Step = 'choose' | 'host' | 'join'

const step = ref<Step>('choose')
const serverIP = ref('localhost')
const connecting = ref(false)
const error = ref('')

const detectLocalIP = () => {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  serverIP.value = isMobile ? '192.168.43.1' : 'localhost'
}

const showHostInstructions = () => {
  detectLocalIP()
  step.value = 'host'
}

const copyIP = () => {
  navigator.clipboard.writeText(`${serverIP.value}:8080`)
}

const connectToLAN = () => {
  if (!serverIP.value) return
  
  connecting.value = true
  error.value = ''
  
  const wsUrl = `ws://${serverIP.value}:8080/ws`
  emit('connect', wsUrl)
  
  // Reset connecting after a timeout (parent handles actual connection)
  setTimeout(() => {
    connecting.value = false
  }, 1500)
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

.copy-btn {
  background: transparent;
  border: 1px solid #444;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
}

.ip-presets {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.preset-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #444;
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: #aaa;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.preset-btn.active {
  background: rgba(0,200,100,0.2);
  border-color: #00cc66;
  color: #00ff88;
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
</style>
