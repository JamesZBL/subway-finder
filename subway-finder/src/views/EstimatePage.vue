<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getStationsForDirection } from '../data/stations'
import { getStandardRunningTime, getTotalRunningTime, getStandardStopTime } from '../data/timetable'

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()

const lineId = ref(route.query.lineId)
const stationName = ref(route.query.stationName)
const direction = ref(route.query.direction)
const stations = ref([])
const fullRouteEstimate = ref([])

// 计时器
const timer = ref(null)
const refreshTick = ref(0)

// 获取站点列表
onMounted(() => {
  if (lineId.value && direction.value) {
    stations.value = getStationsForDirection(lineId.value, direction.value) || []
    calculateFullRouteEstimate()
    
    // 每秒刷新一次时间估算
    timer.value = setInterval(() => {
      refreshTick.value++
      calculateFullRouteEstimate()
    }, 1000)
  }
})

// 清理定时器
onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})

// 从store获取当前状态信息
const currentStation = computed(() => {
  return subwayStore.getCurrentStation(lineId.value, direction.value)
})

const nextStation = computed(() => {
  return subwayStore.getNextStation(lineId.value, currentStation.value?.name, direction.value)
})

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '--:--:--'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 计算全程时间估算
const calculateFullRouteEstimate = () => {
  if (!stations.value.length || !lineId.value || !currentStation.value) {
    fullRouteEstimate.value = []
    return
  }
  
  // 获取当前状态和开始时间
  const eventType = subwayStore.getCurrentEventType(lineId.value, direction.value)
  const startTime = subwayStore.getStartTimestamp(lineId.value, direction.value)
  
  if (!startTime) {
    fullRouteEstimate.value = []
    return
  }
  
  const currentStationName = currentStation.value.name
  const currentTime = new Date().getTime()
  const estimates = []
  
  // 找到当前站在站点列表中的索引
  const currentStationIndex = stations.value.findIndex(station => 
    station.name === currentStationName
  )
  
  if (currentStationIndex === -1) {
    fullRouteEstimate.value = []
    return
  }
  
  // 计算每个站点的预计到达和发车时间
  let estimatedTime = currentTime
  
  // 处理当前站点的状态
  const currentStationData = {
    name: stations.value[currentStationIndex].name,
    isCurrentStation: true,
    isNextStation: false
  }
  
  // 根据当前状态设置到达/发车时间
  if (eventType === 1) { // 到站状态
    currentStationData.arrivalTime = '已到站'
    
    // 计算发车时间
    const standardStopTime = getStandardStopTime(
      lineId.value,
      currentStationName,
      direction.value
    ) || subwayStore.calculateAverageStopTimeAtStation(
      lineId.value,
      currentStationName,
      direction.value
    ) || 30000 // 默认30秒
    
    const elapsedStopTime = currentTime - startTime
    if (elapsedStopTime >= standardStopTime) {
      currentStationData.departureTime = '即将发车'
      estimatedTime = currentTime
    } else {
      const departureTime = startTime + standardStopTime
      currentStationData.departureTime = formatTime(departureTime)
      estimatedTime = departureTime
    }
  } else if (eventType === 2) { // 起步状态
    currentStationData.arrivalTime = '--:--:--'
    currentStationData.departureTime = '已发车'
    
    // 下一站被视为当前要到达的站点
    if (currentStationIndex + 1 < stations.value.length) {
      const nextStationName = stations.value[currentStationIndex + 1].name
      
      // 计算到达下一站的时间
      const standardRunTime = getStandardRunningTime(
        lineId.value,
        currentStationName,
        nextStationName,
        direction.value
      ) || subwayStore.calculateAverageTimeBetweenStations(
        lineId.value,
        currentStationName,
        nextStationName,
        direction.value
      ) || 90000 // 默认90秒
      
      const elapsedRunTime = currentTime - startTime
      if (elapsedRunTime >= standardRunTime) {
        // 已经应该到站了
        estimatedTime = currentTime
      } else {
        // 还没到站
        estimatedTime = startTime + standardRunTime
      }
    }
  }
  
  estimates.push(currentStationData)
  
  // 处理接下来的所有站点
  for (let i = currentStationIndex + 1; i < stations.value.length; i++) {
    const station = stations.value[i]
    const prevStation = stations.value[i - 1]
    
    const stationData = {
      name: station.name,
      isCurrentStation: false,
      isNextStation: i === currentStationIndex + 1
    }
    
    // 计算到达时间
    const runTime = getStandardRunningTime(
      lineId.value,
      prevStation.name,
      station.name,
      direction.value
    ) || subwayStore.calculateAverageTimeBetweenStations(
      lineId.value,
      prevStation.name,
      station.name,
      direction.value
    ) || 90000 // 默认90秒
    
    // 到达时间 = 上一站发车时间 + 运行时间
    const arrivalTime = estimatedTime + runTime
    stationData.arrivalTime = formatTime(arrivalTime)
    
    // 计算发车时间（如果不是终点站）
    if (i < stations.value.length - 1) {
      const stopTime = getStandardStopTime(
        lineId.value,
        station.name,
        direction.value
      ) || subwayStore.calculateAverageStopTimeAtStation(
        lineId.value,
        station.name,
        direction.value
      ) || 30000 // 默认30秒
      
      // 发车时间 = 到达时间 + 停车时间
      const departureTime = arrivalTime + stopTime
      stationData.departureTime = formatTime(departureTime)
      
      // 更新下一站的预计时间基准
      estimatedTime = departureTime
    } else {
      // 终点站没有发车时间
      stationData.departureTime = '终点站'
    }
    
    estimates.push(stationData)
  }
  
  // 处理当前站之前的站点（如果有）
  let prevEstimatedTime = null
  
  for (let i = currentStationIndex - 1; i >= 0; i--) {
    const station = stations.value[i]
    const nextStation = stations.value[i + 1]
    
    const stationData = {
      name: station.name,
      isCurrentStation: false,
      isNextStation: false,
      arrivalTime: '已到站',
      departureTime: '已发车'
    }
    
    estimates.unshift(stationData)
  }
  
  fullRouteEstimate.value = estimates
}

// 返回上一页
const goBack = () => {
  router.go(-1)
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
      <button class="back-button" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>全程时间估算</h1>
      <button class="home-button" @click="goToHome">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
    </div>
    
    <div class="estimate-container">
      <div class="estimate-note">注：时间估算基于历史数据，仅供参考</div>
      
      <div class="estimate-content">
        <table class="estimate-table">
          <thead>
            <tr>
              <th>站点</th>
              <th>预计到达</th>
              <th>预计发车</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(station, index) in fullRouteEstimate" :key="index" 
                :class="{
                  'current-station-row': station.isCurrentStation,
                  'next-station-row': station.isNextStation
                }">
              <td class="station-name-cell">
                <span v-if="station.isCurrentStation" class="current-indicator">⦿</span>
                <span v-else-if="station.isNextStation" class="next-indicator">➔</span>
                {{ station.name }}
              </td>
              <td>{{ station.arrivalTime }}</td>
              <td>{{ station.departureTime }}</td>
            </tr>
            <tr v-if="!fullRouteEstimate.length">
              <td colspan="3" class="no-data">暂无估算数据</td>
            </tr>
          </tbody>
        </table>
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
}

.ios-navbar h1 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}

.back-button, .home-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #007aff;
  background: none;
  padding: 0;
}

.estimate-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.estimate-note {
  font-size: 14px;
  color: #8e8e93;
  margin-bottom: 16px;
  text-align: center;
}

.estimate-content {
  background-color: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.estimate-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.estimate-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  font-weight: 600;
  color: #8e8e93;
}

.estimate-table td {
  padding: 8px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.station-name-cell {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-station-row {
  background-color: rgba(0, 122, 255, 0.1);
}

.next-station-row {
  background-color: rgba(52, 199, 89, 0.1);
}

.current-indicator {
  color: #007aff;
  margin-right: 4px;
}

.next-indicator {
  color: #34c759;
  margin-right: 4px;
}

.no-data {
  text-align: center;
  color: #8e8e93;
  padding: 16px;
}
</style> 