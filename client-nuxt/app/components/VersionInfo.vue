<template>
  <div class="version-info" :class="{ dev: versionInfo.isDev, dirty: versionInfo.isDirty }">
    <span class="version">App: v{{ versionInfo.version }}</span>
    <span v-if="libVersion" class="version lib"> | Lib: {{ libVersion }}</span>
    <!-- In Dev: show hash/HMR based on dirty state. In Prod: hide details -->
    <template v-if="versionInfo.isDev && showDetails">
      <span class="hash">({{ hashDisplay }})</span>
      <span class="date">{{ dateDisplay }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVersionInfo } from '~/composables/useVersionInfo'

defineProps<{
  showDetails?: boolean
}>()

const versionInfo = useVersionInfo()
const currentTime = ref('')
const libVersion = ref('')

onMounted(() => {
  currentTime.value = new Date().toLocaleTimeString()
  
  // Fetch Lib Version
  if (import.meta.client) {
      // Try local (relative) first, or fallback if needed (though usually relative works)
       fetch('/debug/version')
        .then(res => res.text())
        .then(v => { libVersion.value = v })
        .catch(() => { /* Ignore fetch error (e.g. standalone dev mode) */ })
  }
})

// If dirty (uncommitted changes), show HMR mode
const hashDisplay = computed(() => {
  return versionInfo.isDirty ? 'HMR' : versionInfo.commitHash
})


const dateDisplay = computed(() => {
  return versionInfo.isDirty ? currentTime.value : versionInfo.commitDate
})
</script>

<style scoped>
.version-info {
  display: inline-flex;
  margin-top: 1rem;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.version-info.dev {
  color: #888;
}

.version-info.dirty {
  color: #f5a623;
  background: rgba(245, 166, 35, 0.1);
}

.version {
  font-weight: 600;
}

.hash {
  color: #888;
  font-family: monospace;
}

.date {
  color: #777;
  font-size: 0.65rem;
}
</style>
