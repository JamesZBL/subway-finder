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
</script>

<template>
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <div class="ios-navbar">
      <div class="ios-back-button" @click="goBack">返回</div>
      <h1>{{ mode === 'collection' ? '选择线路' : '选择线路' }}</h1>
      <div style="width: 50px; visibility: hidden;">占位</div>
    </div>
    
    <div class="page-content">
      <div class="ios-list">
        <div 
          v-for="line in subwayStore.lines" 
          :key="line.id" 
          class="line-item"
          @click="() => handleLineSelect(line)"
        >
          <div class="line-color" :style="{ backgroundColor: getLineColor(line.id) }"></div>
          <div class="line-name">{{ line.name }}</div>
          <div class="chevron-right"></div>
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

.ios-list {
  border-radius: 12px;
  overflow: hidden;
  background-color: white;
  margin-bottom: 16px;
}

.line-item {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  position: relative;
  min-height: 44px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s;
  background-color: transparent;
}

.line-item:last-child {
  border-bottom: none;
}

.line-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}

@media (hover: hover) {
  .line-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .line-item:hover:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.line-color {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  margin-right: 16px;
  flex-shrink: 0;
}

.line-name {
  font-size: 17px;
  font-weight: 400;
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

@media (prefers-color-scheme: dark) {
  .ios-list {
    background-color: #1c1c1e;
  }
  
  .line-item {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .line-item:active {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .line-name {
    color: #ffffff;
  }
  
  .chevron-right {
    border-color: #636366;
  }
}
</style> 