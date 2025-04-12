<script setup>
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import toast from '../utils/toast'

const router = useRouter()
const subwayStore = useSubwayStore()
const mode = subwayStore.currentMode

// 处理线路选择
const handleLineSelect = (line) => {
  subwayStore.setCurrentLine(line)
  toast.success(`已选择: ${line.name}`, 3000)
  router.push({
    path: '/directions',
    query: { 
      lineId: line.id,
      mode: subwayStore.currentMode
    }
  })
}

// 返回首页
const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="lines-container">
    <div class="header-with-back">
      <button class="back-button" @click="goBack">
        <span>←</span>
      </button>
      <h2 class="page-title">{{ mode === 'collection' ? '选择要采集的线路' : '选择要展示的线路' }}</h2>
    </div>

    <div class="lines-grid">
      <button 
        v-for="line in subwayStore.lines" 
        :key="line.id" 
        class="line-button"
        :style="{ backgroundColor: getLineColor(line.id) }"
        @click="() => handleLineSelect(line)"
      >
        {{ line.name }}
      </button>
    </div>
  </div>
</template>

<script>
// 获取线路颜色
function getLineColor(lineId) {
  const colors = {
    '1': '#CC0000',
    '2': '#0052CC',
    '4': '#009933',
    '5': '#AC39AC',
    '6': '#FF6600',
    '7': '#FFC600',
    '8': '#009999',
    '9': '#8FC31F',
    '10': '#009DFF',
    '13': '#FFDC35',
    '14': '#D9A900',
    '15': '#AC6E2E',
    '16': '#8DC73F',
    'bt': '#DC1773',
    'cp': '#F99EC7',
    'fs': '#D85F26',
    'yz': '#FF9900',
    'dx': '#00B1B0',
    'sh': '#6D3C89',
  }
  return colors[lineId] || '#666666'
}
</script>

<style scoped>
.lines-container {
  padding: 1rem;
}

.header-with-back {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.line-button {
  padding: 1rem;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.line-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 480px) {
  .lines-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .line-button {
    height: 60px;
    font-size: 1rem;
  }
}
</style> 