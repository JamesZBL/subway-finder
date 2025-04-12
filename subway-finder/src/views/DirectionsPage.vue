<script setup>
import { defineProps, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getDirectionsForLine } from '../data/stations'
import toast from '../utils/toast'

const props = defineProps({
  lineId: String,
  mode: String
})

const router = useRouter()
const subwayStore = useSubwayStore()
const directions = ref([])

onMounted(() => {
  if (props.lineId) {
    const line = subwayStore.getLineById(props.lineId)
    if (line) {
      subwayStore.setCurrentLine(line)
      subwayStore.setMode(props.mode || 'display')
    }
    
    directions.value = getDirectionsForLine(props.lineId)
  }
})

// 处理方向选择
const handleDirectionSelect = (direction) => {
  subwayStore.setCurrentDirection(direction)
  
  // 显示选择方向的Toast提示，延长显示时间
  toast.success(`已选择: ${direction.name}`, 3000)
  
  router.push({
    path: '/stations',
    query: { 
      lineId: props.lineId,
      mode: props.mode,
      direction: direction.id
    }
  })
}

// 获取线路颜色
const getLineColor = (lineId) => {
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

// 返回线路选择页面
const goBack = () => {
  router.push('/lines')
}

// 返回首页
const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="directions-container">
    <div class="header-with-back">
      <button class="back-button" @click="goBack">
        <span>←</span>
      </button>
      <h2 class="page-title" v-if="subwayStore.currentLine">
        {{ subwayStore.currentLine.name }}
        <span>选择方向</span>
      </h2>
      
      <button class="home-button" @click="goToHome" title="返回首页">
        <span>🏠</span>
      </button>
    </div>
    
    <div class="directions-list">
      <button 
        v-for="direction in directions" 
        :key="direction.id" 
        class="direction-button"
        :style="{ backgroundColor: getLineColor(props.lineId) }"
        @click="() => handleDirectionSelect(direction)"
      >
        {{ direction.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.directions-container {
  padding: 1rem;
}

.header-with-back {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.back-button, .home-button {
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

.home-button {
  margin-left: auto;
  background-color: #4CAF50;
  color: white;
  border-radius: 4px;
  font-size: 1.2rem;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.directions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.direction-button {
  padding: 1.5rem;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1.1rem;
  text-align: center;
}

.direction-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

@media (max-width: 480px) {
  .direction-button {
    font-size: 1rem;
    padding: 1.2rem;
  }
}
</style> 