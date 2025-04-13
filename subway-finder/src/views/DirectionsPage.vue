<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getDirectionsForLine, stationData } from '../data/stations'
import toast from '../utils/toast'

const props = defineProps({
  lineId: String,
  mode: String
})

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()
const directions = ref([])
const errorMessage = ref('')

// 调试信息
const debugInfo = computed(() => {
  return {
    lineId: props.lineId || route.query.lineId,
    availableLines: Object.keys(stationData),
    directionsCount: directions.value.length
  }
})

onMounted(() => {
  // 优先使用 props，如果为空则从 route.query 中获取
  const lineId = props.lineId || route.query.lineId
  const mode = props.mode || route.query.mode || 'display'
  
  console.log('DirectionsPage - 已加载：', { lineId, mode, debugInfo: debugInfo.value })
  
  if (lineId) {
    const line = subwayStore.getLineById(lineId)
    if (line) {
      subwayStore.setCurrentLine(line)
      subwayStore.setMode(mode)
    }
    
    // 获取方向列表
    const lineDirections = getDirectionsForLine(lineId)
    
    if (lineDirections && lineDirections.length > 0) {
      directions.value = lineDirections
      console.log('DirectionsPage - 已获取方向列表：', lineDirections)
    } else {
      errorMessage.value = `未找到线路 ${lineId} 的方向信息`
      console.error('DirectionsPage - 错误：', errorMessage.value)
      toast.error(errorMessage.value, 3000)
    }
  } else {
    errorMessage.value = '未提供线路ID'
    console.error('DirectionsPage - 错误：', errorMessage.value)
    toast.error(errorMessage.value, 3000)
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
      lineId: props.lineId || route.query.lineId,
      mode: props.mode || route.query.mode || 'display',
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
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <div class="ios-navbar">
      <div class="ios-back-button" @click="goBack">返回</div>
      <h1 v-if="subwayStore.currentLine">{{ subwayStore.currentLine.name }}</h1>
      <div class="navbar-right" style="width: 65px; display: flex; justify-content: flex-end;">
        <div class="home-icon" @click="goToHome">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="page-content">
      <div class="directions-header">
        <h2>选择方向</h2>
      </div>
      
      <!-- 方向列表 -->
      <div v-if="directions.length > 0" class="ios-list">
        <div 
          v-for="direction in directions" 
          :key="direction.id" 
          class="direction-item"
          @click="() => handleDirectionSelect(direction)"
        >
          <div class="direction-indicator" :style="{ backgroundColor: getLineColor(props.lineId || route.query.lineId) }"></div>
          <div class="direction-name">{{ direction.name }}</div>
          <div class="chevron-right"></div>
        </div>
      </div>
      
      <!-- 无数据或加载出错时的提示 -->
      <div v-else class="empty-state">
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <div v-else class="loading-message">
          正在加载方向信息...
        </div>
        
        <div class="action-buttons">
          <button class="retry-button" @click="goBack">返回选择线路</button>
          <button class="home-button" @click="goToHome">返回首页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-content {
  padding: 16px;
  overflow-y: auto;
  height: 100%;
  -webkit-overflow-scrolling: touch;
}

.directions-header {
  margin-bottom: 16px;
}

.directions-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.debug-info {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 4px;
}

.ios-list {
  border-radius: 12px;
  overflow: hidden;
  background-color: white;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.direction-item {
  padding: 16px;
  display: flex;
  align-items: center;
  position: relative;
  min-height: 50px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s;
  background-color: transparent;
}

.direction-item:last-child {
  border-bottom: none;
}

.direction-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 仅在支持悬停的设备上添加悬停效果 */
@media (hover: hover) {
  .direction-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .direction-item:hover:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.direction-indicator {
  width: 6px;
  height: 24px;
  border-radius: 3px;
  margin-right: 16px;
  flex-shrink: 0;
}

.direction-name {
  font-size: 17px;
  font-weight: 500;
  color: #000000;
  flex: 1;
}

.chevron-right {
  width: 8px;
  height: 8px;
  border-top: 2px solid #c7c7cc;
  border-right: 2px solid #c7c7cc;
  transform: rotate(45deg);
  margin-left: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.error-message {
  color: #ff3b30;
  font-size: 16px;
  margin-bottom: 20px;
}

.loading-message {
  color: #8e8e93;
  font-size: 16px;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 250px;
}

.retry-button, .home-button {
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  border: none;
  outline: none;
}

.retry-button {
  background-color: #007aff;
  color: white;
}

.home-button {
  background-color: #e5e5ea;
  color: #007aff;
}

.home-icon {
  width: 22px;
  height: 22px;
  color: #007aff;
  cursor: pointer;
}
</style> 