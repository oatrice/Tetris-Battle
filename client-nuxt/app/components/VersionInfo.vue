<template>
  <div class="version-info" :class="{ dev: versionInfo.isDev }">
    <span class="version">v{{ versionInfo.version }}</span>
    <!-- In Dev: always show HMR mode. In Prod: hide details -->
    <template v-if="versionInfo.isDev && showDetails">
      <span class="hash">(HMR)</span>
      <span class="date">{{ currentTime }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVersionInfo } from '~/composables/useVersionInfo'

defineProps<{
  showDetails?: boolean
}>()

const versionInfo = useVersionInfo()

// Current time - updates on mount (HMR will re-mount and update this)
const currentTime = ref('')

onMounted(() => {
  currentTime.value = new Date().toLocaleTimeString()
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
