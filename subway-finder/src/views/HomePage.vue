<script setup>
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { ref, onMounted, computed } from 'vue'

const router = useRouter()
const subwayStore = useSubwayStore()
const currentTime = ref(new Date())
const recentLines = ref([])
const colonVisible = ref(true) // 用于控制冒号闪烁
const mapZoom = ref(1) // 地图缩放级别

// 每秒更新时间并实现冒号闪烁
setInterval(() => {
  currentTime.value = new Date()
  colonVisible.value = !colonVisible.value
}, 500) // 改为500ms，让冒号每半秒闪烁一次

// 格式化当前时间包含秒数
const formattedTime = computed(() => {
  const hours = currentTime.value.getHours().toString().padStart(2, '0')
  const minutes = currentTime.value.getMinutes().toString().padStart(2, '0')
  const seconds = currentTime.value.getSeconds().toString().padStart(2, '0')
  const colon = colonVisible.value ? ':' : ' '
  return `${hours}${colon}${minutes}${colon}${seconds}`
})

// 获取星期几
const weekDay = computed(() => {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return days[currentTime.value.getDay()]
})

// 获取日期
const formattedDate = computed(() => {
  const year = currentTime.value.getFullYear()
  const month = (currentTime.value.getMonth() + 1).toString().padStart(2, '0')
  const date = currentTime.value.getDate().toString().padStart(2, '0')
  return `${year}年${month}月${date}日`
})

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

// 获取最近使用的线路
onMounted(() => {
  // 模拟最近使用的线路数据，实际应用中应从存储获取
  const allLines = subwayStore.lines.slice(0, 4)
  recentLines.value = allLines
})

// 导航到特定线路
const navigateToLine = (line) => {
  subwayStore.setCurrentLine(line)
  subwayStore.setMode('display')
  router.push({
    path: '/directions',
    query: { 
      lineId: line.id,
      mode: 'display'
    }
  })
}

// 导航到采集运行数据页面
const navigateToCollection = () => {
  subwayStore.setMode('collection')
  router.push('/lines')
}

// 导航到开始展示页面
const navigateToDisplay = () => {
  subwayStore.setMode('display')
  router.push('/lines')
}

// 打开线路图大图
const openFullMap = () => {
  const modalElem = document.getElementById('map-modal')
  if (modalElem) {
    modalElem.style.display = 'flex'
    // 重置缩放级别
    mapZoom.value = 1
  }
}

// 关闭线路图大图
const closeFullMap = () => {
  const modalElem = document.getElementById('map-modal')
  if (modalElem) {
    modalElem.style.display = 'none'
  }
}

// 放大地图
const zoomInMap = () => {
  mapZoom.value = Math.min(5, mapZoom.value + 0.5)
}

// 缩小地图
const zoomOutMap = () => {
  mapZoom.value = Math.max(0.5, mapZoom.value - 0.5)
}

// 重置地图缩放
const resetMapZoom = () => {
  mapZoom.value = 1
}
</script>

<template>
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <div class="ios-navbar">
      <h1>北京地铁</h1>
    </div>
    
    <div class="home-container">
      <!-- 当前时间和日期卡片 -->
      <div class="ios-card time-card">
        <div class="time-display">{{ formattedTime }}</div>
        <div class="date-info">
          <div class="current-date">{{ formattedDate }}</div>
          <div class="week-day">{{ weekDay }}</div>
        </div>
      </div>
      
      <!-- 地铁信息卡片 -->
      <div class="ios-card metro-info-card">
        <div class="card-header">
          <div class="card-title">北京轨道交通</div>
          <div class="card-subtitle">Beijing Rail Transit</div>
        </div>
        <div class="metro-stats">
          <div class="stat-item">
            <div class="stat-value">27</div>
            <div class="stat-label">运营线路</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">459</div>
            <div class="stat-label">车站数量</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">798.5</div>
            <div class="stat-label">运营里程(km)</div>
          </div>
        </div>
      </div>
      
      <!-- 地铁线路图预览 -->
      <div class="subway-image-container" @click="openFullMap">
        <div class="card-header">
          <div class="card-title">线路图</div>
          <div class="card-action">点击查看大图</div>
        </div>
        <div class="subway-image">
          <img src="/images/Beijing Rail Transit Lines.png" alt="北京地铁线路图" class="map-preview">
        </div>
      </div>
      
      <!-- 最近使用的线路 -->
      <div class="recent-lines-section">
        <div class="section-header">
          <h2>常用线路</h2>
        </div>
        
        <div class="recent-lines">
          <div 
            v-for="line in recentLines" 
            :key="line.id" 
            class="recent-line-item"
            @click="() => navigateToLine(line)"
          >
            <div class="line-color-indicator" :style="{ backgroundColor: getLineColor(line.id) }"></div>
            <div class="line-name">{{ line.name }}</div>
          </div>
        </div>
      </div>
      
      <!-- 应用介绍 -->
      <div class="ios-card app-intro-card">
        <div class="app-intro-title">关于应用</div>
        <p class="app-intro-text">
          北京地铁查询应用提供便捷的实时地铁位置展示和数据采集功能。您可以查看实时地铁位置、预计到达时间，或为完善线路数据提供数据采集支持。
        </p>
      </div>
      
      <!-- 主要操作按钮 -->
      <div class="action-buttons">
        <button class="ios-button collection" @click="navigateToCollection">
          <div class="button-icon">📊</div>
          <div class="button-text">
            <div class="button-title">采集运行数据</div>
            <div class="button-subtitle">记录车站到达和发车信息</div>
          </div>
        </button>
        
        <button class="ios-button display" @click="navigateToDisplay">
          <div class="button-icon">🚇</div>
          <div class="button-text">
            <div class="button-title">开始展示</div>
            <div class="button-subtitle">查看实时地铁位置和运行信息</div>
          </div>
        </button>
      </div>
      
      <div class="version-info">版本 1.0.0</div>
    </div>
    
    <!-- 线路图全屏模态框 -->
    <div id="map-modal" class="map-modal" @click="closeFullMap">
      <div class="map-modal-content" @click.stop>
        <div class="map-modal-header">
          <h3>北京轨道交通线路图</h3>
          <button class="close-button" @click="closeFullMap">✕</button>
        </div>
        <div class="map-modal-body">
          <div class="fullscreen-map-container">
            <img 
              src="/images/Beijing Rail Transit Lines.png" 
              alt="北京地铁线路图" 
              class="fullscreen-map"
              :style="{ transform: `scale(${mapZoom})` }"
            >
          </div>
          
          <!-- 地图缩放控制按钮 -->
          <div class="map-zoom-controls">
            <button class="zoom-button" @click="zoomInMap">+</button>
            <button class="zoom-button" @click="zoomOutMap">-</button>
            <button class="zoom-button reset-button" @click="resetMapZoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
  gap: 12px; /* 减小卡片间距 */
}

.time-card {
  padding: 20px; /* 增加内边距 */
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.time-display {
  font-size: 32px;
  font-weight: 600;
  color: #007aff;
  font-family: 'SF Mono', monospace; /* 使用等宽字体 */
  letter-spacing: 1px; /* 调整字符间距 */
  min-width: 160px; /* 确保足够宽度显示秒数 */
}

.date-info {
  text-align: right;
}

.current-date {
  font-size: 14px;
  color: #8e8e93;
}

.week-day {
  font-size: 16px;
  font-weight: 600;
  margin-top: 4px;
}

.metro-info-card {
  padding: 20px; /* 增加内边距 */
}

.card-header {
  margin-bottom: 16px; /* 增加卡片标题下方间距 */
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
}

.card-subtitle {
  font-size: 14px;
  color: #8e8e93;
  margin-top: 4px;
}

.card-action {
  font-size: 14px;
  color: #007aff;
}

.metro-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
}

.stat-item {
  text-align: center;
  width: 33%; /* 确保均匀分布 */
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #007aff;
}

.stat-label {
  font-size: 12px;
  color: #8e8e93;
  margin-top: 4px;
}

.subway-image-container {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 20px 20px 0 20px; /* 增加内边距 */
  position: relative;
  cursor: pointer;
}

.subway-image {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  height: 160px; /* 固定高度 */
}

.map-preview {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover; /* 改为cover以确保正常显示 */
}

.section-header {
  margin-bottom: 12px;
  padding: 0 4px; /* 增加左右内边距 */
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.recent-lines {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.recent-line-item {
  background-color: white;
  border-radius: 10px;
  padding: 16px; /* 增加内边距 */
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, background-color 0.2s;
}

.recent-line-item:active {
  transform: scale(0.98);
  background-color: rgba(0, 0, 0, 0.05);
}

@media (hover: hover) {
  .recent-line-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .recent-line-item:hover:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.line-color-indicator {
  width: 18px;
  height: 18px;
  border-radius: 9px;
  margin-right: 12px; /* 增加右边距 */
}

.line-name {
  font-size: 16px;
  font-weight: 500;
}

.app-intro-card {
  padding: 20px; /* 增加内边距 */
}

.app-intro-title {
  font-size: 17px;
  font-weight: 600;
  margin-bottom: 12px; /* 增加下边距 */
}

.app-intro-text {
  font-size: 15px;
  line-height: 1.5; /* 增加行高 */
  color: #3a3a3c;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 4px; /* 增加上边距 */
}

.ios-button {
  height: auto;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  padding: 16px 20px; /* 增加水平内边距 */
  transition: transform 0.2s, opacity 0.2s;
}

.button-icon {
  font-size: 24px;
  margin-right: 16px;
}

.button-text {
  text-align: left;
  flex: 1;
}

.button-title {
  font-size: 17px;
  font-weight: 600;
}

.button-subtitle {
  font-size: 13px;
  opacity: 0.8;
  margin-top: 4px;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 文本溢出显示省略号 */
}

.ios-button.collection {
  background-color: #34c759;
}

.ios-button.display {
  background-color: #007aff;
}

.ios-button:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.version-info {
  text-align: center;
  font-size: 12px;
  color: #8e8e93;
  margin-top: 16px;
  margin-bottom: 16px;
}

/* 线路图全屏模态框样式 */
.map-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
}

.map-modal-content {
  width: 90%;
  max-width: 90%;
  height: 90%;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.map-modal-header {
  padding: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.map-modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

.close-button {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #f1f1f1;
  color: #8e8e93;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
}

.map-modal-body {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.fullscreen-map-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.fullscreen-map {
  max-width: none;
  min-width: 100%;
  min-height: 100%;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.2s ease;
}

/* 地图缩放控制按钮 */
.map-zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.zoom-button {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s, transform 0.2s;
}

.zoom-button:active {
  transform: scale(0.95);
  background-color: rgba(0, 0, 0, 0.8);
}

.reset-button {
  font-size: 16px;
}

@media (prefers-color-scheme: dark) {
  .app-intro-text {
    color: #e5e5ea;
  }
  
  .map-modal-content {
    background-color: #1c1c1e;
  }
  
  .map-modal-header {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .close-button {
    background-color: #2c2c2e;
    color: #8e8e93;
  }
  
  .zoom-button {
    background-color: rgba(60, 60, 60, 0.8);
  }
  
  .zoom-button:active {
    background-color: rgba(80, 80, 80, 0.9);
  }
}
</style> 