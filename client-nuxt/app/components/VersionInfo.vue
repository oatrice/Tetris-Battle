<template>
  <div class="version-info" :class="{ dev: versionInfo.isDev }">
    <span class="version">v{{ versionInfo.version }}</span>
    <span class="hash">({{ versionInfo.commitHash }})</span>
    <span v-if="showDetails" class="date">{{ versionInfo.commitDate }}</span>
  </div>
</template>

<script setup lang="ts">
import { useVersionInfo } from '~/composables/useVersionInfo'

defineProps<{
  showDetails?: boolean
}>()

const versionInfo = useVersionInfo()
</script>

<style scoped>
.version-info {
  display: inline-flex;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: #666;
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
  color: #666;
  font-size: 0.65rem;
}
</style>
