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
            <button v-if="serverIP" @click="serverIP = ''" class="clear-btn" title="Clear">✕</button>
            <span class="port-label">:8080</span>
            <button @click="copyIP" class="copy-btn" title="Copy">📋</button>
          </div>
          <div class="ip-presets">
            <button @click="serverIP = 'localhost'" :class="{ active: serverIP === 'localhost' }" class="preset-btn">💻 PC</button>
            <button @click="serverIP = '192.168.'" :class="{ active: serverIP === '192.168.' }" class="preset-btn">🌐 192.168...</button>
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
            <button v-if="serverIP" @click="serverIP = ''" class="clear-btn" title="Clear">✕</button>
            <span class="port-label">:8080</span>
          </div>

          <!-- History -->
          <div v-if="ipHistory.length > 0" class="history-section">
             <div class="history-header">
                 <span>Recent:</span>
                 <button @click="clearHistory" class="clear-history-btn">Clear All</button>
             </div>
             <div class="history-list">
                 <div v-for="ip in ipHistory" :key="ip" class="history-item">
                     <span @click="serverIP = ip" class="history-ip">{{ ip }}</span>
                     <button @click="removeHistory(ip)" class="delete-history-btn" title="Remove">✕</button>
                 </div>
             </div>
          </div>

          <div class="ip-presets">
             <button @click="serverIP = 'localhost'" :class="{ active: serverIP === 'localhost' }" class="preset-btn">💻 Localhost</button>
             <button @click="serverIP = '192.168.'" :class="{ active: serverIP === '192.168.' }" class="preset-btn">🌐 192.168...</button>
             <button @click="serverIP = getBrowserHostname()" class="preset-btn">🔗 Browser IP</button>
          </div>

          <div class="scan-section">
            <div class="scan-settings" v-if="!isScanning">
                 <label class="setting-label">🚀 Scan Speed: {{ scanBatchSize }} IPs/batch</label>
                 <input type="range" v-model.number="scanBatchSize" min="5" max="50" step="5" class="range-slider">
            </div>

            <div class="scan-info" v-if="isScanning">
                <div class="progress-text">
                    <span>⏱️ {{ scanDuration }}s</span>
                    <span>Checked: {{ scannedCount }}/255</span>
                </div>
                <div class="batch-text" v-if="currentBatchRange">
                    Scanning: {{ currentBatchRange }}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: (scannedCount/255)*100 + '%' }"></div>
                </div>
            </div>

            <div class="scan-controls">
                <button @click="scanLAN" class="scan-btn" :disabled="isScanning">
                🔍 {{ isScanning ? 'Scanning...' : 'Scan LAN' }}
                </button>
                <button v-if="isScanning" @click="stopScan" class="stop-scan-btn">
                🛑 Stop
                </button>
            </div>
            
            <div v-if="foundHosts.length > 0" class="found-hosts">
              <span class="found-label">Found Servers:</span>
              <div class="hosts-list">
                <button 
                  v-for="host in foundHosts" 
                  :key="host" 
                  class="found-host" 
                  @click="serverIP = host"
                >
                  📡 {{ host }}
                </button>
              </div>
            </div>
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
import { ref, watch } from 'vue'

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'connect', wsUrl: string): void
}>()

const props = defineProps<{
  connected: boolean
  connectionError?: string
}>()

type Step = 'choose' | 'host' | 'join'

const step = ref<Step>('choose')
const serverIP = ref('localhost')
const connecting = ref(false)
const error = ref('')
const isScanning = ref(false)
const foundHosts = ref<string[]>([])
const ipHistory = ref<string[]>([])

// Scan Settings & Progress
const scanBatchSize = ref(20)
const scannedCount = ref(0)
const scanDuration = ref("0.0")
const currentBatchRange = ref("")
let scanTimer: any = null

// Watch for prop error
watch(() => props.connectionError, (newVal) => {
    if (newVal) {
        error.value = newVal
        connecting.value = false
    }
})

// Load history on init
if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('lan_ip_history')
    if (saved) {
        try {
            ipHistory.value = JSON.parse(saved)
        } catch (e) {
            console.error('Failed to parse IP history', e)
        }
    }
}

const saveHistory = (ip: string) => {
    if (!ip || ip === 'localhost') return
    // Remove if exists to push to top
    ipHistory.value = ipHistory.value.filter(h => h !== ip)
    ipHistory.value.unshift(ip)
    // Keep max 5
    if (ipHistory.value.length > 5) ipHistory.value.pop()
    localStorage.setItem('lan_ip_history', JSON.stringify(ipHistory.value))
}

const removeHistory = (ip: string) => {
    ipHistory.value = ipHistory.value.filter(h => h !== ip)
    localStorage.setItem('lan_ip_history', JSON.stringify(ipHistory.value))
}

const clearHistory = () => {
    ipHistory.value = []
    localStorage.removeItem('lan_ip_history')
}

// WebRTC trick to get local IP
const detectLocalIPWithWebRTC = async () => {
  return new Promise<string>((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(pc.setLocalDescription.bind(pc))
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return
        const result = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate)
        if (result && result[1]) {
           // Ignore 127.0.0.1
           if (result[1] !== '127.0.0.1') {
             resolve(result[1])
             pc.close()
           }
        }
      }
      setTimeout(() => {
          pc.close()
          resolve('') 
      }, 1000)
    } catch (e) {
      resolve('')
    }
  })
}

const detectLocalIP = () => {
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  serverIP.value = isMobile ? '192.168.43.1' : 'localhost'
}

const showHostInstructions = async () => {
    step.value = 'host'
    // Try to detect real IP
    const ip = await detectLocalIPWithWebRTC()
    if (ip) {
        serverIP.value = ip
    } else {
        detectLocalIP() // fallback
    }
}

const stopScan = () => {
    isScanning.value = false
    error.value = 'Scan stopped'
}

const scanLAN = async () => {
  foundHosts.value = []
  isScanning.value = true
  error.value = ''
  
  // Try to update subnet from local IP if input is default or empty
  if (serverIP.value === 'localhost' || !serverIP.value || serverIP.value === '192.168.') {
      console.log('[LAN] Trying to auto-detect local IP via WebRTC...')
      const detected = await detectLocalIPWithWebRTC()
      console.log('[LAN] Detected Local IP:', detected)
      if (detected) {
          // Only update if it looks different, to trigger reactivity
          serverIP.value = detected 
      }
  }

  // Determine subnet from current input or default to 192.168.1.
  let subnet = '192.168.1' // Default Fallback
  
  // Extract subnet from serverIP (which might have been updated above)
  const ipMatch = serverIP.value.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.?/)
  if (ipMatch && ipMatch[1]) {
    subnet = ipMatch[1]
  }

  // console.log(`[LAN] Scanning Subnet: ${subnet}.x`)
  // error.value = `Scanning ${subnet}.1 - ${subnet}.255 ...`

  const port = 8080
  
  // Helper to scan a single IP
  const scanIP = async (ip: string) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      try {
          if (!isScanning.value) return // Stop early

          // Log probing attempt
          // console.log(`[LAN] Probing ${ip}...`)
          
          let res: Response | null = null
          
          try {
              // Try standard CORS first
              res = await fetch(`http://${ip}:${port}/debug/version`, { 
                  method: 'GET',
                  signal: controller.signal,
                  mode: 'cors',
                  cache: 'no-store'
              })
          } catch (corsErr) {
              // If CORS fails, try no-cors to detect existence
              if (isScanning.value) {
                 try {
                     res = await fetch(`http://${ip}:${port}/debug/version`, { 
                          method: 'GET',
                          signal: controller.signal,
                          mode: 'no-cors',
                          cache: 'no-store'
                      })
                 } catch (ign) {}
              }
          }

          if (res) {
              if (res.ok || res.type === 'opaque') {
                  console.log(`[LAN] ✅ Found Host at ${ip} (Type: ${res.type})`)
                  if (!foundHosts.value.includes(ip)) {
                      foundHosts.value.push(ip)
                  }
              } else {
                  console.log(`[LAN] ⚠️ Response from ${ip} but not OK`)
              }
          }
      } catch (e: any) {
          // Log specific error for debugging
           if (e.name !== 'AbortError') {
            //  console.warn(`[LAN] Error probing ${ip}:`, e)
           }
      } finally {
          clearTimeout(timeoutId)
      }
  }

  // Generate all IPs
  const allIPs: string[] = []
  for (let i = 1; i <= 255; i++) {
      allIPs.push(`${subnet}.${i}`)
  }

  // Start Timer
  const startTime = performance.now()
  scanDuration.value = "0.0"
  scannedCount.value = 0
  if (scanTimer) clearInterval(scanTimer)
  scanTimer = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000
    scanDuration.value = elapsed.toFixed(1)
  }, 100)

  // Process in batches
  for (let i = 0; i < allIPs.length; i += scanBatchSize.value) {
      if (!isScanning.value) break // Allow canceling
      const batch = allIPs.slice(i, i + scanBatchSize.value)
      
      // Update UI for current batch
      currentBatchRange.value = `${batch[0]} - ${batch[batch.length-1]}`
      
      await Promise.all(batch.map(ip => scanIP(ip)))
      
      scannedCount.value += batch.length
  }

  isScanning.value = false
  clearInterval(scanTimer)
  currentBatchRange.value = ''
  
  if (foundHosts.value.length === 0 && !error.value.includes('stopped')) {
      error.value = `No servers found in ${subnet}.x`
  } else if (foundHosts.value.length > 0) {
      error.value = '' // Clear scanning message
  }
}

const copyIP = () => {
  navigator.clipboard.writeText(`${serverIP.value}:8080`)
}

const getBrowserHostname = () => {
    return window.location.hostname
}

const connectToLAN = () => {
  if (!serverIP.value) return
  
  saveHistory(serverIP.value)

  connecting.value = true
  error.value = ''
  
  const wsUrl = `ws://${serverIP.value}:8080/ws`
  emit('connect', wsUrl)
  
  // Parent should handle success/fail. 
  // If parent fails, it will pass 'connectionError' prop back
  // If parent succeeds, this component is unmounted.
  
  // Safety fallback: if app.vue doesn't respond with error or success within 10s, reset UI
  setTimeout(() => {
    if (connecting.value) {
        connecting.value = false
        error.value = 'Connection attempt timed out (UI Failsafe)'
    }
  }, 10000)
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

.clear-btn {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-weight: bold;
    padding: 0 0.5rem;
    font-size: 1.2rem;
}

.clear-btn:hover {
    color: #ff6b6b;
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

.presets-btn:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.preset-btn.active {
  background: rgba(0,200,100,0.2);
  border-color: #00cc66;
  color: #00ff88;
}

.history-section {
    width: 100%;
    margin-top: 0.5rem;
}

.history-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 0.3rem;
}

.clear-history-btn {
    background: transparent;
    border: none;
    color: #ff6b6b;
    font-size: 0.75rem;
    cursor: pointer;
}

.history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.history-item {
    display: flex;
    align-items: center;
    background: #1a1a2a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 0.2rem 0.6rem;
    font-family: monospace;
    font-size: 0.9rem;
}

.history-ip {
    cursor: pointer;
    color: #aaa;
    margin-right: 0.4rem;
}

.history-ip:hover {
    color: white;
}

.delete-history-btn {
    background: transparent;
    border: none;
    color: #666;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.delete-history-btn:hover {
    color: #ff6b6b;
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

.scan-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(0,0,0,0.2);
  padding: 0.8rem;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.scan-btn {
  background: #2a2a40;
  border: 1px solid #444;
  color: #88ccff;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  flex: 1;
}

.scan-controls {
    display: flex;
    gap: 0.5rem;
    width: 100%;
}

.stop-scan-btn {
    background: #3f1a1a;
    border: 1px solid #ff4444;
    color: #ff6b6b;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.stop-scan-btn:hover {
    background: #5a2020;
    color: white;
}

.scan-btn:hover:not(:disabled) {
  background: #3a3a50;
  color: white;
  border-color: #666;
}

.scan-btn:disabled {
  opacity: 0.5;
  cursor: wait;
}

.found-hosts {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.found-label {
  font-size: 0.8rem;
  color: #888;
}

.hosts-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.found-host {
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-family: monospace;
}

.found-host:hover {
  background: rgba(0, 255, 136, 0.2);
  transform: translateX(4px);
}

.scan-settings {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
}

.setting-label {
    font-size: 0.8rem;
    color: #aaa;
}

.range-slider {
    width: 100%;
    accent-color: #00ff88;
}

.scan-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.5rem;
    background: rgba(0,0,0,0.3);
    padding: 0.5rem;
    border-radius: 4px;
}

.progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: #fff;
    font-family: monospace;
}

.batch-text {
    font-size: 0.75rem;
    color: #88ccff;
    text-align: center;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: #444;
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #00ff88;
    transition: width 0.3s ease;
}
</style>
