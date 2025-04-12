<script setup>
import { defineProps, ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getStationsForDirection } from '../data/stations'
import toast from '../utils/toast'

const props = defineProps({
  lineId: String,
  mode: String,
  direction: String
})

const router = useRouter()
const subwayStore = useSubwayStore()
const stations = ref([])
const directionInfo = ref(null)
const currentStatus = ref('') // 当前状态显示
const lastEvent = ref(null) // 记录最后一次操作的事件
const elapsedTime = ref(0) // 记录已经过时间（秒）
const updateTimer = ref(null) // 定时器引用

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
  if (props.lineId && props.direction) {
    const dataKey = `${props.lineId}-${props.direction}`
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
  if (props.lineId && props.direction) {
    stations.value = getStationsForDirection(props.lineId, props.direction)
    const line = subwayStore.getLineById(props.lineId)
    subwayStore.setCurrentLine(line)
    subwayStore.setMode(props.mode || 'display')
    
    // 从父组件获取线路方向信息并设置
    import('../data/stations').then(module => {
      const directions = module.getDirectionsForLine(props.lineId)
      directionInfo.value = directions.find(d => d.id === props.direction)
      if (directionInfo.value) {
        subwayStore.setCurrentDirection(directionInfo.value)
      }
      
      // 改进点8：不加载上次状态，而是显示初始状态
      currentStatus.value = '当前位置：未开始运行'
      lastEvent.value = null
      
      // 启动定时器，每秒更新一次时间
      updateTimer.value = setInterval(updateElapsedTime, 1000)
    })
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
      props.direction
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
        direction: props.direction
      }
    })
  }
}

// 撤销最近的一个操作
const cancelLastEvent = () => {
  if (subwayStore.currentLine && props.direction) {
    subwayStore.cancelLastEvent(subwayStore.currentLine.id, props.direction)
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
      lineId: props.lineId,
      mode: props.mode
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
        <div class="direction-info" v-if="directionInfo">
          {{ directionInfo.name }}
        </div>
        <div class="mode-info">
          <span v-if="subwayStore.currentMode === 'collection'">数据采集模式</span>
          <span v-else>位置展示模式</span>
        </div>
      </div>
      
      <!-- 当前状态面板 -->
      <div class="ios-card status-card" v-if="currentStatus">
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
              当前位置：<span class="station-name">{{ lastEvent.stationName }}站已到达</span>
            </template>
            <template v-else-if="lastEvent && lastEvent.eventType === 'departure'">
              <template v-if="getNextStation(lastEvent.stationName)">
                当前位置：<span class="station-name">{{ lastEvent.stationName }}开往{{ getNextStation(lastEvent.stationName).name }}</span>
              </template>
              <template v-else>
                当前位置：<span class="station-name">{{ lastEvent.stationName }}已是终点站</span>
              </template>
            </template>
            <template v-else>
              当前位置：未开始运行
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
        </div>
        
        <div class="stations-list ios-list">
          <div class="station-row" v-for="station in stations" :key="station.name">
            <div class="station-actions">
              <button 
                class="station-button arrival" 
                @click="() => handleStationSelect(station, 'arrival')"
                :style="{ borderColor: getLineColor(props.lineId) }"
                :class="{ 'disabled': getButtonState(station, 'arrival').disabled }"
                :disabled="getButtonState(station, 'arrival').disabled"
                :title="getButtonState(station, 'arrival').reason"
              >
                到站
              </button>
              
              <button 
                class="station-button departure" 
                @click="() => handleStationSelect(station, 'departure')"
                :style="{ borderColor: getLineColor(props.lineId) }"
                :class="{ 'disabled': getButtonState(station, 'departure').disabled }"
                :disabled="getButtonState(station, 'departure').disabled"
                :title="getButtonState(station, 'departure').reason"
              >
                起步
              </button>
            </div>
            <div class="station-name-display">{{ station.name }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-content {
  padding: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.info-card {
  padding: 16px;
  margin-bottom: 16px;
}

.direction-info {
  font-size: 17px;
  font-weight: 500;
  color: #000000;
  margin-bottom: 8px;
}

.mode-info {
  font-size: 14px;
  color: #8e8e93;
}

.status-card {
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
}

.status-icon {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 16px;
  background-color: #007aff;
  color: white;
  flex-shrink: 0;
}

.status-icon.arrival-icon {
  background-color: #ff9500;
}

.status-icon.departure-icon {
  background-color: #34c759;
}

.status-content {
  flex: 1;
}

.status-text {
  font-size: 17px;
  font-weight: 400;
  margin-bottom: 12px;
}

.station-name {
  font-weight: 600;
  color: #007aff;
}

.time-info {
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.05);
  padding: 8px 12px;
  border-radius: 8px;
}

.time-label {
  font-size: 14px;
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
}

.cancel-button {
  width: 100%;
  background-color: #ff3b30;
  height: 44px;
  font-size: 17px;
  border-radius: 10px;
}

.section-header {
  margin-bottom: 12px;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.stations-list {
  margin-bottom: 24px;
}

.station-row {
  padding: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.station-row:last-child {
  border-bottom: none;
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

@media (prefers-color-scheme: dark) {
  .direction-info {
    color: #ffffff;
  }
  
  .status-text {
    color: #ffffff;
  }
  
  .station-name {
    color: #0a84ff;
  }
  
  .time-info {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .station-row {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
}
</style> 