<template>
  <div class="container" @keydown="handleKeydown" tabindex="0" ref="gameContainer">
    <h1>🎮 Tetris Duo</h1>
    
    <!-- Mode Selection -->
    <div v-if="!gameMode" class="mode-select">
      <div class="mode-buttons">
        <button @click="startSolo" class="mode-btn solo">🎯 Solo</button>
        <button @click="startSpecial" class="mode-btn special">✨ Special</button>
        <button @click="startDuo" class="mode-btn duo">👥 Duo</button>
        <button @click="startOnline" class="mode-btn online">🌐 Online</button>
        <button @click="startLAN" class="mode-btn lan">📡 LAN</button>
        <button @click="showLeaderboard = true" class="mode-btn leaderboard">🏆 Leaderboard</button>
      </div>
    </div>
    
    <!-- Leaderboard Modal -->
    <Leaderboard 
      v-if="showLeaderboard" 
      @close="showLeaderboard = false" 
      :initialTab="(gameMode || 'solo') as any"
    />

    <!-- Version Info at Bottom -->
    <VersionInfo v-if="!gameMode" :showDetails="true" class="home-version" />

    <!-- Solo Mode -->
    <div v-else-if="gameMode === 'solo' || gameMode === 'special'" class="game-area">
      <SoloGame :game="soloGame!" @restart="restartGame" @back="backToMenu" :isSpecialMode="gameMode === 'special'" />
    </div>

    <!-- Duo Mode -->
    <div v-else-if="gameMode === 'duo'" class="duo-area">
      <DuoGameComponent 
        :duoGame="duoGame!" 
        @restart="restartDuo" 
        @show-leaderboard="showLeaderboard = true"
        @back="backToMenu" 
      />
    </div>

    <!-- Online Mode -->
    <div v-else-if="gameMode === 'online'" class="online-area">
      <OnlineGameComponent 
        :onlineGame="onlineGame!" 
        mode="online"
        @back="backToMenu" 
      />
    </div>

    <!-- LAN Mode -->
    <div v-else-if="gameMode === 'lan'" class="lan-area">
      <LANGameComponent 
        v-if="!onlineGame"
        :connected="!!onlineGame"
        @back="backToMenu" 
        @connect="connectLAN"
      />
      <OnlineGameComponent 
        v-else
        :onlineGame="onlineGame!" 
        mode="lan"
        @back="backToMenu" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent, reactive, shallowRef, triggerRef } from 'vue'
import { Game } from '~/game/Game'
import { SpecialGame } from '~/game/SpecialGame'
import { DuoGame } from '~/game/DuoGame'
import { OnlineGame } from '~/game/OnlineGame'

const SoloGame = defineAsyncComponent(() => import('~/components/SoloGame.vue'))
const DuoGameComponent = defineAsyncComponent(() => import('~/components/DuoGame.vue'))
const OnlineGameComponent = defineAsyncComponent(() => import('~/components/OnlineGame.vue'))
const LANGameComponent = defineAsyncComponent(() => import('~/components/LANGame.vue'))
const VersionInfo = defineAsyncComponent(() => import('~/components/VersionInfo.vue'))
const Leaderboard = defineAsyncComponent(() => import('~/components/Leaderboard.vue'))

type GameMode = 'solo' | 'special' | 'duo' | 'online' | 'lan' | null

const gameContainer = ref<HTMLDivElement | null>(null)
const gameMode = ref<GameMode>(null)
const soloGame = shallowRef<Game | null>(null)
const duoGame = shallowRef<DuoGame | null>(null)
const onlineGame = shallowRef<OnlineGame | null>(null)
const showLeaderboard = ref(false)

// Get runtime config for WebSocket URL
const config = useRuntimeConfig()

let animationId: number | null = null
let lastUpdate = 0
const DROP_INTERVAL = 1000

// ============ Mode Selection ============
const remoteLog = (msg: string) => {
  if (import.meta.client && window.location.port === '8080') {
    fetch('/debug/log', { method: 'POST', body: msg }).catch(() => {})
  }
}

const startSolo = () => {
  remoteLog('User started Solo Mode')
  gameMode.value = 'solo'
  soloGame.value = reactive(new Game()) as any
  startGameLoop()
}

const startSpecial = () => {
  remoteLog('User started Special Mode')
  gameMode.value = 'special'
  soloGame.value = reactive(new SpecialGame()) as any
  startGameLoop()
}

const startDuo = () => {
  remoteLog('User started Duo Mode')
  gameMode.value = 'duo'
  duoGame.value = new DuoGame()
  startGameLoop()
}

const startOnline = () => {
  remoteLog('User clicked Online Mode')
  gameMode.value = 'online'
  const game = new OnlineGame()
  
  let wsUrl = config.public.wsUrl
  // Auto-detect if running on same port (Serving from Go)
  if (import.meta.client && window.location.port === '8080') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws`
      console.log('Auto-detected WS URL:', wsUrl)
  }

  game.init(wsUrl)
  onlineGame.value = game
  startGameLoop()
}

const startLAN = () => {
  gameMode.value = 'lan'
  onlineGame.value = null // Reset until user connects
}

const connectLAN = (wsUrl: string) => {
  const game = new OnlineGame()
  game.init(wsUrl)
  onlineGame.value = game
  startGameLoop()
}

const restartGame = () => {
  if (gameMode.value === 'special') {
    soloGame.value = reactive(new SpecialGame()) as any
  } else {
    soloGame.value = reactive(new Game()) as any
  }
}

const restartDuo = () => {
  duoGame.value = new DuoGame()
}

const backToMenu = () => {
  // Cleanup
  if (onlineGame.value) {
      onlineGame.value.cleanup()
  }
  
  gameMode.value = null
  soloGame.value = null
  duoGame.value = null
  onlineGame.value = null
  
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// ============ Game Loop ============
let lastFrameTime = 0

const startGameLoop = () => {
  lastFrameTime = 0
  
  const gameLoop = (timestamp: number) => {
    // Calculate deltaTime for animations
    const deltaTime = lastFrameTime > 0 ? timestamp - lastFrameTime : 0
    lastFrameTime = timestamp
    
    // Update Special mode cascade animation
    if (gameMode.value === 'special' && soloGame.value && !soloGame.value.isPaused && !soloGame.value.isGameOver) {
      (soloGame.value as SpecialGame).update(deltaTime)
    }
    
    // Auto drop
    if (timestamp - lastUpdate > DROP_INTERVAL) {
      if ((gameMode.value === 'solo' || gameMode.value === 'special') && soloGame.value && !soloGame.value.isPaused && !soloGame.value.isGameOver) {
        if (gameMode.value !== 'special' || !(soloGame.value as SpecialGame).isCascading) {
          soloGame.value.moveDown()
        }
      } else if (gameMode.value === 'duo' && duoGame.value) {
        duoGame.value.tick()
      } else if ((gameMode.value === 'online' || gameMode.value === 'lan') && onlineGame.value && !onlineGame.value.isGameOver && onlineGame.value.isOpponentConnected) {
         if (onlineGame.value.countdown === null && !onlineGame.value.isPaused) {
             onlineGame.value.moveDown()
         }
      }
      lastUpdate = timestamp
    }

    // [FIX] Trigger ref update manually since we switched to shallowRef
    if (gameMode.value === 'solo' || gameMode.value === 'special') triggerRef(soloGame)
    else if (gameMode.value === 'duo') triggerRef(duoGame)
    else if (gameMode.value === 'online' || gameMode.value === 'lan') triggerRef(onlineGame)

    animationId = requestAnimationFrame(gameLoop)
  }
  animationId = requestAnimationFrame(gameLoop)
}

// ============ Keyboard Controls ============
const handleKeydown = (e: KeyboardEvent) => {
  if ((gameMode.value === 'solo' || gameMode.value === 'special') && soloGame.value) {
    handleSoloControls(e)
  } else if (gameMode.value === 'duo' && duoGame.value) {
    handleDuoControls(e)
  } else if ((gameMode.value === 'online' || gameMode.value === 'lan') && onlineGame.value) {
    handleOnlineControls(e)
  }
}

const handleSoloControls = (e: KeyboardEvent) => {
  if (!soloGame.value || soloGame.value.isGameOver) return
  
  switch (e.code) {
    case 'ArrowLeft': soloGame.value.moveLeft(); break
    case 'ArrowRight': soloGame.value.moveRight(); break
    case 'ArrowDown': soloGame.value.moveDown(true); break
    case 'ArrowUp': soloGame.value.rotate(); break
    case 'Space': e.preventDefault(); soloGame.value.hardDrop(); break
    case 'KeyC': case 'ShiftLeft': case 'ShiftRight': soloGame.value.hold(); break
    case 'KeyP': case 'Escape': soloGame.value.togglePause(); break
  }
}

const handleOnlineControls = (e: KeyboardEvent) => {
  if (!onlineGame.value || onlineGame.value.isGameOver || !onlineGame.value.isOpponentConnected) return
  // NOTE: We do NOT return if countdown !== null because pause should work? 
  // Wait, original design said no controls during countdown. 
  // Let's keep it safe: if countdown, no controls interact (pause isn't useful in countdown).
  if (onlineGame.value.countdown !== null) return
  
  switch (e.key) {
    case 'ArrowLeft': 
    case 'a': onlineGame.value.moveLeft(); break
    
    case 'ArrowRight': 
    case 'd': onlineGame.value.moveRight(); break
    
    case 'ArrowDown': 
    case 's': onlineGame.value.moveDown(); break
    
    case 'ArrowUp': 
    case 'w': onlineGame.value.rotate(); break
    
    case ' ': 
    case 'Enter': e.preventDefault(); onlineGame.value.hardDrop(); break
    
    case 'c': 
    case 'C': 
    case 'q':
    case 'Q': onlineGame.value.hold(); break

    // Pause
    case 'p':
    case 'P':
    case 'Escape': onlineGame.value.togglePause(); break
  }
}

const handleDuoControls = (e: KeyboardEvent) => {
  if (!duoGame.value || duoGame.value.winner) return
  
  // Pause toggle
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    duoGame.value.togglePause()
    return
  }
  
  if (duoGame.value.isPaused) return
  
  // Player 1
  switch (e.key.toLowerCase()) {
    case 'a': duoGame.value.p1MoveLeft(); break
    case 'd': duoGame.value.p1MoveRight(); break
    case 's': duoGame.value.p1MoveDown(); break
    case 'w': duoGame.value.p1Rotate(); break
    case 'q': duoGame.value.p1Hold(); break
    case 'e': duoGame.value.p1HardDrop(); break
  }
  
  // Player 2
  switch (e.key) {
    case 'ArrowLeft': duoGame.value.p2MoveLeft(); break
    case 'ArrowRight': duoGame.value.p2MoveRight(); break
    case 'ArrowDown': duoGame.value.p2MoveDown(); break
    case 'ArrowUp': duoGame.value.p2Rotate(); break
    case ',': duoGame.value.p2Hold(); break
    case '.': duoGame.value.p2HardDrop(); break
  }
}

onMounted(() => {
  gameContainer.value?.focus()
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.container {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 1rem;
  font-family: 'Segoe UI', sans-serif;
  text-align: center;
  outline: none;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  box-sizing: border-box;
}

h1 {
  color: #00d4ff;
  margin-bottom: 1.5rem;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

/* Mode Selection */
.mode-select {
  display: flex;
  justify-content: center;
  margin-top: 4rem;
}

.mode-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  max-width: 500px;
}

.mode-btn {
  padding: 1.5rem 2.5rem;
  font-size: 1.25rem;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  font-weight: bold;
}

.mode-btn.solo {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.mode-btn.special {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

.mode-btn.duo {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  color: #1a1a2e;
}

.mode-btn.online {
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  color: white;
}

.mode-btn.lan {
  background: linear-gradient(135deg, #11998e, #38ef7d);
  color: #1a1a2e;
}

.mode-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.mode-btn.leaderboard {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #1a1a2e;
  grid-column: span 2;
}

/* Duos */
.duo-area, .online-area, .lan-area {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

/* Global Styles */
.game-area {
  display: flex;
  justify-content: center;
}

@media (max-width: 600px) {
  .mode-buttons {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0 1rem;
  }

  .mode-btn.leaderboard {
    grid-column: span 1;
  }
  
  .mode-select {
    margin-top: 2rem;
  }
  
  h1 {
    font-size: 2rem;
  }

  /* Hide Duo mode on mobile */
  .mode-btn.duo {
    display: none;
  }
}
</style>
