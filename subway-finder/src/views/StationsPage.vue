<script setup>
import { defineProps, ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getStationsForDirection } from '../data/stations'
import toast from '../utils/toast'

// 获取环境变量
const isDev = ref(import.meta.env.DEV || false)

const props = defineProps({
  lineId: String,
  mode: String,
  direction: String
})

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()
const stations = ref([])
const directionInfo = ref(null)
const currentStatus = ref('') // 当前状态显示
const lastEvent = ref(null) // 记录最后一次操作的事件
const elapsedTime = ref(0) // 记录已经过时间（秒）
const updateTimer = ref(null) // 定时器引用

// 从props或route.query中获取参数
const lineId = computed(() => props.lineId || route.query.lineId)
const direction = computed(() => props.direction || route.query.direction)
const mode = computed(() => props.mode || route.query.mode || 'display')

// 调试信息
const debugInfo = computed(() => {
  return {
    lineId: lineId.value,
    direction: direction.value,
    mode: mode.value,
    stationsCount: stations.value.length,
    queryParams: route.query
  }
})

// 格式化时间显示
const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours}小时${minutes > 0 ? minutes + '分' : ''}${remainingSeconds > 0 ? remainingSeconds + '秒' : ''}`
  }
}

// 计算当前最后一次事件
const getLastEvent = () => {
  if (lineId.value && direction.value) {
    const dataKey = `${lineId.value}-${direction.value}`
    const events = subwayStore.runningData[dataKey] || []
    
    if (events.length > 0) {
      // 按时间排序，获取最新的事件
      const sortedEvents = [...events].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      
      return sortedEvents[0]
    }
  }
  
  return null
}

// 更新已经过时间，每秒调用一次
const updateElapsedTime = () => {
  if (!lastEvent.value) return
  
  const lastEventTime = new Date(lastEvent.value.timestamp).getTime()
  const now = new Date().getTime()
  elapsedTime.value = Math.floor((now - lastEventTime) / 1000)
  
  updateCurrentStatus()
}

// 更新当前状态显示
const updateCurrentStatus = () => {
  if (!lastEvent.value) {
    currentStatus.value = '当前位置：未开始运行'
    return
  }
  
  const eventStationName = lastEvent.value.stationName
  const stationIndex = stations.value.findIndex(s => s.name === eventStationName)
  
  if (stationIndex === -1) {
    currentStatus.value = '当前位置：位置未知'
    return
  }
  
  const formattedTime = formatTime(elapsedTime.value)
  
  if (lastEvent.value.eventType === 'arrival') {
    // 到站事件
    currentStatus.value = `当前位置：${eventStationName}站已到达（停车${formattedTime}）`
  } else if (lastEvent.value.eventType === 'departure') {
    // 起步事件，查找下一站
    const nextStationIndex = stationIndex + 1
    if (nextStationIndex < stations.value.length) {
      const nextStation = stations.value[nextStationIndex]
      currentStatus.value = `当前位置：${eventStationName}开往${nextStation.name}（行驶${formattedTime}）`
    } else {
      currentStatus.value = `当前位置：${eventStationName}已是终点站（停车${formattedTime}）`
    }
  }
}

onMounted(() => {
  if (lineId.value && direction.value) {
    console.log('StationsPage - 加载站点列表:', { lineId: lineId.value, direction: direction.value })
    
    // 获取站点列表
    stations.value = getStationsForDirection(lineId.value, direction.value)
    console.log('StationsPage - 获取到站点列表:', stations.value)
    
    // 如果站点列表为空，记录错误并提示
    if (!stations.value || stations.value.length === 0) {
      console.error('StationsPage - 错误: 未找到站点数据')
      toast.error('未找到该线路方向的站点数据', 3000)
    }
    
    const line = subwayStore.getLineById(lineId.value)
    subwayStore.setCurrentLine(line)
    subwayStore.setMode(mode.value)
    
    // 从父组件获取线路方向信息并设置
    import('../data/stations').then(module => {
      const directions = module.getDirectionsForLine(lineId.value)
      directionInfo.value = directions.find(d => d.id === direction.value)
      if (directionInfo.value) {
        subwayStore.setCurrentDirection(directionInfo.value)
      } else {
        console.error('StationsPage - 错误: 未找到方向信息', { 
          lineId: lineId.value, 
          direction: direction.value,
          availableDirections: directions
        })
        toast.error('未找到该线路的方向信息', 3000)
      }
      
      // 改进点8：不加载上次状态，而是显示初始状态
      currentStatus.value = '当前位置：未开始运行'
      lastEvent.value = null
      
      // 启动定时器，每秒更新一次时间
      updateTimer.value = setInterval(updateElapsedTime, 1000)
    })
  } else {
    console.error('StationsPage - 错误: 缺少必要参数', { lineId: lineId.value, direction: direction.value })
    toast.error('缺少必要参数，无法加载站点列表', 3000)
  }
})

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  if (updateTimer.value) {
    clearInterval(updateTimer.value)
    updateTimer.value = null
  }
})

// 检查操作是否合法
const isOperationValid = (station, eventType) => {
  // 获取站点在线路中的索引
  const stationIndex = stations.value.findIndex(s => s.name === station.name)
  const isFirstStation = stationIndex === 0
  const isLastStation = stationIndex === stations.value.length - 1
  
  // 初始状态下的验证
  if (!lastEvent.value) {
    // 始发站不能到达
    if (isFirstStation && eventType === 'arrival') return false
    
    // 终到站不能到达
    if (isLastStation && eventType === 'arrival') return false
    
    // 改进点12: 终到站不能起步，始发站可以起步
    if (isLastStation && eventType === 'departure') return false
    
    return true
  }
  
  // 获取上一个事件站点的索引
  const lastStationIndex = stations.value.findIndex(s => s.name === lastEvent.value.stationName)
  
  // 如果无法找到站点索引，返回不合法
  if (lastStationIndex === -1 || stationIndex === -1) return false
  
  // 上一个事件是到站
  if (lastEvent.value.eventType === 'arrival') {
    // 当前站点相同，则当前操作必须是起步
    if (lastStationIndex === stationIndex) {
      return eventType === 'departure'
    }
    // 当前站点在前一站之前，不合法
    else if (stationIndex < lastStationIndex) {
      return false
    }
    // 当前站点在前一站之后，只能是到站事件
    else {
      return eventType === 'arrival'
    }
  }
  // 上一个事件是起步
  else if (lastEvent.value.eventType === 'departure') {
    // 当前站点在前一站之前，不合法
    if (stationIndex < lastStationIndex) {
      return false
    }
    // 不允许同一站点先起步后到站，违反逻辑
    if (stationIndex === lastStationIndex && eventType === 'arrival') {
      return false
    }
    // 不允许同一站点连续起步两次，违反逻辑
    if (stationIndex === lastStationIndex && eventType === 'departure') {
      return false
    }
    // 当前站点必须是下一站或之后的站点，且只能是到站事件
    else if (stationIndex > lastStationIndex) {
      return eventType === 'arrival'
    }
  }
  
  return true
}

// 处理站点选择
const handleStationSelect = (station, eventType) => {
  // 采集模式下检查操作合法性
  if (subwayStore.currentMode === 'collection') {
    if (!isOperationValid(station, eventType)) {
      toast.error(`操作不合法：${eventType === 'arrival' ? '到站' : '起步'}操作顺序有误`, 3000)
      return
    }
  }
  
  subwayStore.setCurrentStation(station)
  
  if (subwayStore.currentMode === 'collection') {
    // 采集数据模式：记录到站或起步事件
    subwayStore.recordTrainEvent(
      subwayStore.currentLine.id,
      station.name,
      eventType,
      direction.value
    )
    
    // 显示Toast提示，延长显示时间到3秒
    const eventText = eventType === 'arrival' ? '已到站' : '已起步'
    toast.success(`${station.name}，${eventText}`, 3000)
    
    // 更新最后一次事件和重置计时器
    lastEvent.value = getLastEvent()
    elapsedTime.value = 0
    updateCurrentStatus()
  } else {
    // 展示模式：导航到地图页面
    router.push({
      path: '/map',
      query: { 
        lineId: subwayStore.currentLine.id,
        stationName: station.name,
        eventType,
        direction: direction.value
      }
    })
  }
}

// 撤销最近的一个操作
const cancelLastEvent = () => {
  if (subwayStore.currentLine && direction.value) {
    subwayStore.cancelLastEvent(subwayStore.currentLine.id, direction.value)
    toast.info('已撤销最近一次操作', 3000)
    
    // 更新最后一次事件和重置计时器
    lastEvent.value = getLastEvent()
    elapsedTime.value = 0
    updateCurrentStatus()
  }
}

// 线路颜色
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

// 返回方向选择页面
const goBack = () => {
  router.push({
    path: '/directions',
    query: {
      lineId: lineId.value,
      mode: mode.value
    }
  })
}

// 返回首页
const goToHome = () => {
  router.push('/')
}

// 站点可操作性判断
const getButtonState = (station, eventType) => {
  if (subwayStore.currentMode !== 'collection') return { disabled: false }
  
  // 获取站点在线路中的索引
  const stationIndex = stations.value.findIndex(s => s.name === station.name)
  const isFirstStation = stationIndex === 0
  const isLastStation = stationIndex === stations.value.length - 1
  
  // 改进点11和12: 初始状态下的按钮禁用判断
  if (!lastEvent.value) {
    // 始发站不能到达
    if (isFirstStation && eventType === 'arrival') {
      return { disabled: true, reason: '始发站不能到达，没有意义' }
    }
    
    // 终到站不能到达
    if (isLastStation && eventType === 'arrival') {
      return { disabled: true, reason: '终点站不能直接到达，需要从前一站起步' }
    }
    
    // 改进点12: 终到站不能起步
    if (isLastStation && eventType === 'departure') {
      return { disabled: true, reason: '终点站不能起步，没有意义' }
    }
    
    return { disabled: false }
  }
  
  // 改进点9: 选择a站起步后，屏蔽按钮'a站到达'
  if (lastEvent.value.stationName === station.name && 
      lastEvent.value.eventType === 'departure' && 
      eventType === 'arrival') {
    return { disabled: true, reason: '站点起步后不能立即到站' }
  }
  
  // 改进点10: 选择a站起步后，屏蔽按钮'a站起步'
  if (lastEvent.value.stationName === station.name && 
      lastEvent.value.eventType === 'departure' && 
      eventType === 'departure') {
    return { disabled: true, reason: '站点不能起步两次' }
  }
  
  if (!isOperationValid(station, eventType)) {
    return { disabled: true, reason: '操作顺序有误' }
  }
  
  return { disabled: false }
}

// 获取某站点的下一站
const getNextStation = (stationName) => {
  const stationIndex = stations.value.findIndex(s => s.name === stationName)
  if (stationIndex === -1 || stationIndex >= stations.value.length - 1) return null
  return stations.value[stationIndex + 1]
}
</script>

<template>
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <!-- iOS风格导航栏 -->
    <div class="ios-navbar">
      <div class="ios-back-button" @click="goBack">返回</div>
      <h1 v-if="subwayStore.currentLine">{{ subwayStore.currentLine.name }}</h1>
      <div class="home-icon" @click="goToHome">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
    </div>
    
    <div class="page-content">
      <!-- 方向和模式信息 -->
      <div class="ios-card info-card">
        <div class="card-header">
          <h3>线路方向</h3>
        </div>
        <div class="card-body">
          <div class="direction-info" v-if="directionInfo">
            {{ directionInfo.name }}
          </div>
          <div v-else class="direction-info error-text">
            未找到方向信息 ({{ direction }})
          </div>
          <div class="mode-info">
            <span v-if="subwayStore.currentMode === 'collection'">数据采集模式</span>
            <span v-else>位置展示模式</span>
          </div>
        </div>
        
        <!-- 调试信息，仅在开发环境显示 -->
        <div class="debug-info" v-if="isDev">
          <details>
            <summary>调试信息</summary>
            <pre>{{ JSON.stringify(debugInfo, null, 2) }}</pre>
          </details>
        </div>
      </div>
      
      <!-- 当前状态面板 -->
      <div class="ios-card status-card" v-if="currentStatus">
        <div class="card-header">
          <h3>当前状态</h3>
        </div>
        <div class="card-body">
          <div class="status-content-wrapper">
            <div class="status-icon" :class="{
              'arrival-icon': lastEvent && lastEvent.eventType === 'arrival',
              'departure-icon': lastEvent && lastEvent.eventType === 'departure'
            }">
              <span v-if="lastEvent && lastEvent.eventType === 'arrival'">🚉</span>
              <span v-else-if="lastEvent && lastEvent.eventType === 'departure'">🚄</span>
              <span v-else>🔄</span>
            </div>
            <div class="status-content">
              <div class="status-text">
                <template v-if="lastEvent && lastEvent.eventType === 'arrival'">
                  <span class="station-name">{{ lastEvent.stationName }}站已到达</span>
                </template>
                <template v-else-if="lastEvent && lastEvent.eventType === 'departure'">
                  <template v-if="getNextStation(lastEvent.stationName)">
                    <span class="station-name">{{ lastEvent.stationName }}开往{{ getNextStation(lastEvent.stationName).name }}</span>
                  </template>
                  <template v-else>
                    <span class="station-name">{{ lastEvent.stationName }}已是终点站</span>
                  </template>
                </template>
                <template v-else>
                  <span>未开始运行</span>
                </template>
              </div>
              <div class="time-info" v-if="lastEvent">
                <div class="time-label">
                  {{ lastEvent.eventType === 'arrival' ? '停车时间' : '行驶时间' }}:
                </div>
                <div class="time-value">{{ formatTime(elapsedTime) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 撤销按钮 -->
      <div v-if="subwayStore.currentMode === 'collection' && lastEvent" class="cancel-section">
        <button class="cancel-button" @click="cancelLastEvent">
          撤销最近操作
        </button>
      </div>
      
      <!-- 站点列表 -->
      <div class="stations-section">
        <div class="section-header">
          <h2>选择站点</h2>
          <div class="stations-count" v-if="stations.length > 0">
            共 {{ stations.length }} 个站点
          </div>
        </div>
        
        <!-- 数据加载中 -->
        <div v-if="stations.length === 0" class="empty-state">
          <div class="loading-icon">🔄</div>
          <div class="empty-text">正在加载站点数据...</div>
          <button class="retry-button" @click="goBack">返回选择方向</button>
        </div>
        
        <!-- 站点列表 -->
        <div v-else class="stations-list ios-list">
          <div class="station-row" v-for="station in stations" :key="station.name">
            <!-- 站点名称放在前面，更符合阅读习惯 -->
            <div class="station-name-display">{{ station.name }}</div>
            
            <div class="station-actions">
              <button 
                class="station-button arrival" 
                @click="() => handleStationSelect(station, 'arrival')"
                :style="{ borderColor: getLineColor(lineId) }"
                :class="{ 'disabled': getButtonState(station, 'arrival').disabled }"
                :disabled="getButtonState(station, 'arrival').disabled"
                :title="getButtonState(station, 'arrival').reason"
              >
                到站
              </button>
              
              <button 
                class="station-button departure" 
                @click="() => handleStationSelect(station, 'departure')"
                :style="{ borderColor: getLineColor(lineId) }"
                :class="{ 'disabled': getButtonState(station, 'departure').disabled }"
                :disabled="getButtonState(station, 'departure').disabled"
                :title="getButtonState(station, 'departure').reason"
              >
                起步
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f2f2f7;
}

.status-bar-spacer {
  height: env(safe-area-inset-top);
  background-color: transparent;
}

.ios-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  z-index: 10; /* 确保导航栏在最上层 */
  position: sticky;
  top: 0;
}

.ios-navbar h1 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ios-back-button {
  font-size: 17px;
  color: #007aff;
  cursor: pointer;
}

.page-content {
  padding: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: max(16px, env(safe-area-inset-bottom)); /* 确保底部有足够的间距 */
}

/* 卡片共通样式 */
.ios-card {
  margin-bottom: 10px;
  padding: 12px 15px;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0; /* 防止被压缩 */
}

.info-card {
  max-height: 114px; /* 设置最大高度 */
  overflow: hidden;
}

.status-card {
  max-height: 100px; /* 设置最大高度 */
}

.card-header {
  margin-bottom: 8px; /* 减小下方间距 */
}

.card-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.direction-info {
  font-size: 15px; /* 适当减小字号 */
  font-weight: 500;
  color: #000000;
  margin-bottom: 6px; /* 减小下方间距 */
  line-height: 1.3; /* 紧凑行高 */
  word-break: break-word;
}

.mode-info {
  font-size: 14px;
  color: #8e8e93;
  margin-top: 8px;
}

.status-content-wrapper {
  display: flex;
  align-items: flex-start;
}

.status-icon {
  width: 36px; /* 减小图标尺寸 */
  height: 36px;
  border-radius: 18px;
  font-size: 18px;
  margin-right: 12px; /* 减小右侧间距 */
  background-color: #007aff;
  color: white;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-icon.arrival-icon {
  background-color: #ff9500;
}

.status-icon.departure-icon {
  background-color: #34c759;
}

.status-content {
  flex: 1;
  min-width: 0;
}

.status-text {
  font-size: 15px; /* 减小字号 */
  margin-bottom: 8px; /* 减小下方间距 */
  line-height: 1.3; /* 紧凑行高 */
  word-wrap: break-word;
}

.station-name {
  font-weight: 600;
  color: #007aff;
}

.time-info {
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 6px 10px; /* 减小内边距 */
  border-radius: 8px;
}

.time-label {
  font-size: 13px; /* 减小字号 */
  color: #8e8e93;
  margin-right: 8px;
}

.time-value {
  font-size: 15px;
  font-weight: 600;
  color: #ff3b30;
}

.cancel-section {
  margin-bottom: 16px;
  flex-shrink: 0; /* 防止被压缩 */
}

.cancel-button {
  width: 100%;
  background-color: #ff3b30;
  height: 40px; /* 稍微减小高度 */
  font-size: 16px; /* 稍微减小字号 */
  border-radius: 10px;
  border: none;
  color: white;
  font-weight: 500;
}

.section-header {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.stations-count {
  padding: 8px 15px;
  font-size: 14px;
  color: #666;
  background-color: #f8f8f8;
  border-bottom: 1px solid #eee;
}

.stations-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 关键: 允许列表区域缩小 */
  max-height: 60vh; /* 限制最大高度为视口高度的60% */
  overflow: hidden; /* 防止溢出 */
}

.stations-list {
  max-height: 60vh; /* 限制列表最大高度 */
  overflow-y: auto;
  margin-bottom: 10px;
  padding: 0;
}

.station-row {
  padding: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s;
  background-color: transparent;
}

.station-row:last-child {
  border-bottom: none;
}

.station-row:active {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 仅在支持悬停的设备上添加悬停效果 */
@media (hover: hover) {
  .station-row:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .station-row:hover:active {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.station-name-display {
  font-size: 17px;
  font-weight: 500;
  margin-bottom: 12px;
}

.station-actions {
  display: flex;
  gap: 12px;
}

.station-button {
  flex: 1;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
}

.station-button.arrival {
  background-color: #ff9500;
}

.station-button.departure {
  background-color: #34c759;
}

.station-button.disabled {
  opacity: 0.5;
  background-color: #8e8e93;
}

.home-icon {
  width: 22px;
  height: 22px;
  color: #007aff;
}

/* 新增空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  flex: 1;
}

.loading-icon {
  font-size: 40px;
  margin-bottom: 16px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-text {
  font-size: 17px;
  color: #8e8e93;
  margin-bottom: 24px;
}

.retry-button {
  background-color: #007aff;
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
}

.debug-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.debug-info summary {
  font-size: 14px;
  color: #8e8e93;
  cursor: pointer;
  padding: 4px 0;
}

.debug-info pre {
  font-size: 12px;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 8px;
}

.error-text {
  color: #ff3b30;
}

/* 站点列表部分的样式调整 */
.stations-section .section-header {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  padding: 0 4px;
}

.stations-section .section-header h2 {
  font-size: 20px; /* 稍微减小字号 */
  font-weight: 600;
  margin: 0;
}

.stations-section .stations-count {
  font-size: 14px;
  color: #8e8e93;
}

.stations-list .station-row {
  padding: 12px 16px; /* 减小上下padding */
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.stations-list .station-name-display {
  font-size: 16px; /* 稍微减小字号 */
  font-weight: 500;
  margin-bottom: 8px; /* 减小下方间距 */
}

.stations-list .station-actions {
  display: flex;
  gap: 12px;
}

.stations-list .station-button {
  flex: 1;
  height: 36px; /* 减小按钮高度 */
  padding: 0;
  border-radius: 8px;
  font-size: 14px; /* 减小字号 */
  font-weight: 500;
}
</style> 