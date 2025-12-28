<template>
  <Transition name="fade">
    <button 
      v-if="canInstall" 
      @click="handleInstall" 
      class="install-btn"
      aria-label="Install App"
    >
      📲 Install App
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const canInstall = ref(false)
let deferredPrompt: any = null

const handleInstall = async () => {
  if (!deferredPrompt) return
  
  // Show the install prompt
  deferredPrompt.prompt()
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice
  console.log(`User response to the install prompt: ${outcome}`)
  
  // We've used the prompt, and can't use it again, throw it away
  deferredPrompt = null
  canInstall.value = false
}

const onInstallPrompt = (e: Event) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault()
  // Stash the event so it can be triggered later.
  deferredPrompt = e
  // Update UI notify the user they can install the PWA
  canInstall.value = true
}

const onAppInstalled = () => {
  // Hide the app-provided install promotion
  canInstall.value = false
  deferredPrompt = null
  console.log('PWA was installed')
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<style scoped>
.install-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  color: white;
  border: none;
  padding: 0.75rem 1.25rem;
  border-radius: 50px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 114, 255, 0.4);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.install-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 114, 255, 0.6);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* On mobile, maybe move it to bottom or make it smaller so it doesn't block title */
@media (max-width: 600px) {
  .install-btn {
    top: auto;
    bottom: 2rem;
    right: 50%;
    transform: translateX(50%);
    width: auto;
    white-space: nowrap;
  }
  
  .install-btn:hover {
    transform: translateX(50%) translateY(-2px);
  }
}
</style>
