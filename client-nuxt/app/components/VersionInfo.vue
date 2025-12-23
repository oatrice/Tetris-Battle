<template>
  <div class="version-info" :class="{ dev: versionInfo.isDev }">
    <span class="version">v{{ versionInfo.version }}</span>
    <!-- Show hash and date only in dev mode -->
    <template v-if="versionInfo.isDev && showDetails">
      <span class="hash">({{ hashDisplay }})</span>
      <span class="date">{{ dateDisplay }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useVersionInfo } from '~/composables/useVersionInfo'

defineProps<{
  showDetails?: boolean
}>()

const versionInfo = useVersionInfo()

// HMR Detection: If hash is 'dev' or empty, show as HMR mode
const isHMR = computed(() => {
  const hash = versionInfo.commitHash
  return !hash || hash === 'dev' || hash === 'now'
})

const hashDisplay = computed(() => {
  return isHMR.value ? 'Dev Changes (HMR)' : versionInfo.commitHash
})

const dateDisplay = computed(() => {
  if (isHMR.value) {
    // Show current time for HMR
    return new Date().toLocaleString()
  }
  return versionInfo.commitDate
})
</script>

<style scoped>
.version-info {
  display: inline-flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #aaa;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.version-info.dev {
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
