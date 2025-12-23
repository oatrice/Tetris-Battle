<template>
  <div class="mini-grid">
    <div v-for="(row, y) in grid" :key="y" class="mini-row">
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

const grid = computed(() => {
  const g: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false) as boolean[])
  const blocks = props.piece.getBlocks()
  const minX = Math.min(...blocks.map(b => b.x))
  const minY = Math.min(...blocks.map(b => b.y))
  
  blocks.forEach(block => {
    const row = block.y - minY
    const col = block.x - minX
    if (row >= 0 && row < 4 && col >= 0 && col < 4 && g[row]) {
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
