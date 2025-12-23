<template>
  <div class="version-info" :class="{ dev: versionInfo.isDev, dirty: versionInfo.isDirty }">
    <span class="version">v{{ versionInfo.version }}</span>
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

onMounted(() => {
  currentTime.value = new Date().toLocaleTimeString()
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
