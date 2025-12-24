<template>
  <div class="mini-grid">
    <div v-for="(row, y) in trimmedGrid" :key="y" class="mini-row">
      <div 
        v-for="(cell, x) in row" 
        :key="x" 
        class="mini-cell"
        :style="{ 
          backgroundColor: cell ? piece.color : 'transparent',
          width: size + 'px',
          height: size + 'px'
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface PieceLike {
  color: string
  getBlocks: () => { x: number, y: number }[]
}

const props = withDefaults(defineProps<{
  piece: PieceLike
  size?: number
}>(), {
  size: 14
})

/**
 * Create trimmed grid - only includes rows/cols that have blocks
 */
const trimmedGrid = computed(() => {
  const blocks = props.piece.getBlocks()
  if (blocks.length === 0) return [[]]
  
  const minX = Math.min(...blocks.map(b => b.x))
  const maxX = Math.max(...blocks.map(b => b.x))
  const minY = Math.min(...blocks.map(b => b.y))
  const maxY = Math.max(...blocks.map(b => b.y))
  
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  
  // Create grid with exact dimensions
  const g: boolean[][] = Array.from({ length: height }, () => 
    Array(width).fill(false) as boolean[]
  )
  
  blocks.forEach(block => {
    const row = block.y - minY
    const col = block.x - minX
    if (g[row]) {
      g[row]![col] = true
    }
  })
  
  return g
})
</script>

<style scoped>
.mini-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.mini-row {
  display: flex;
  gap: 1px;
}

.mini-cell {
  border-radius: 2px;
}
</style>
