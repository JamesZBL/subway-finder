<script setup>
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { ref, onMounted, computed } from 'vue'

const router = useRouter()
const subwayStore = useSubwayStore()
const currentTime = ref(new Date())
const recentLines = ref([])
const colonVisible = ref(true) // 用于控制冒号闪烁

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
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  -webkit-overflow-scrolling: touch;
  gap: 12px; /* 减小卡片间距 */
  margin: 0;
  position: relative;
  box-sizing: border-box;
}

/* 在 iOS WebApp 模式下特别的处理 */
:deep(.ios-webapp-mode) .home-container {
  padding-top: env(safe-area-inset-top) !important;
  padding-bottom: env(safe-area-inset-bottom) !important;
  padding-left: 16px !important;
  padding-right: 16px !important;
  -webkit-overflow-scrolling: touch !important;
}

:deep(.ios-webapp-mode) .status-bar-spacer {
  display: none !important;
}

/* 处理刘海屏，把状态栏区域的颜色调整为 iOS 导航栏的颜色 */
@supports (padding-top: env(safe-area-inset-top)) {
  :deep(.ios-webapp-mode) .ios-navbar {
    padding-top: 0 !important;
    height: 44px !important;
    border-top: env(safe-area-inset-top) solid rgba(255, 255, 255, 0.85) !important;
    box-sizing: content-box !important;
  }
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
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.recent-line-item:active {
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
</style> 