<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getStationsForDirection } from '../data/stations'

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()

const lineId = ref(route.query.lineId)
const stationName = ref(route.query.stationName)
const direction = ref(route.query.direction)
const currentStatus = ref(route.query.currentStatus)
const stations = ref([])

// 加载站点数据
onMounted(() => {
  if (lineId.value && direction.value) {
    stations.value = getStationsForDirection(lineId.value, direction.value) || []
  }
})

// 获取当前站点的索引
const currentStationIndex = computed(() => {
  if (!stations.value.length || !stationName.value) return -1
  return stations.value.findIndex(station => station.name === stationName.value)
})

// 计算当前站点和下一站点
const currentStation = computed(() => {
  if (currentStationIndex.value === -1) return null
  return stations.value[currentStationIndex.value]
})

const nextStation = computed(() => {
  if (currentStationIndex.value === -1 || currentStationIndex.value >= stations.value.length - 1) return null
  return stations.value[currentStationIndex.value + 1]
})

// 格式化时间
const formatCurrentTime = computed(() => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

// 计算当前状态文本
const currentStatusText = computed(() => {
  if (!currentStation.value) return '未开始运行'
  
  if (currentStatus.value === '1') { // 停车状态
    return `${currentStation.value.name}站停车中`
  } else if (currentStatus.value === '2' && nextStation.value) { // 行驶状态
    return `${currentStation.value.name}开往${nextStation.value.name}`
  } else {
    return `${currentStation.value.name}站`
  }
})

// 格式化时间戳
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '未知'
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 获取事件类型文本
const getEventTypeText = (eventType) => {
  return eventType === 'arrival' ? '到站' : '起步'
}

// 获取最近运行记录
const getLatestRecords = () => {
  if (!lineId.value || !direction.value) {
    console.log('lineId或direction为空，无法获取记录')
    return []
  }
  
  // 从store中获取该线路和方向的所有记录
  const allRecords = subwayStore.getRunningDataForLine(lineId.value, direction.value)
  console.log(`获取到${lineId.value}-${direction.value}的运行记录:`, allRecords.length)
  
  // 按时间戳排序，最新的在前
  return [...allRecords].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 10) // 仅返回最新的10条记录
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
    
    <!-- iOS风格导航栏 -->
    <div class="ios-navbar">
      <div class="ios-back-button" @click="goBack">返回</div>
      <h1>运行详情</h1>
      <div style="width: 65px; visibility: hidden;">占位</div>
      <div class="navbar-right" style="position: absolute; right: 10px; top: 0; height: 100%; display: flex; align-items: center;">
        <div class="home-icon" @click="goToHome">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="details-container">
      <div class="details-section">
        <div class="section-title">实时状态</div>
        <div class="data-row">
          <div class="data-label">当前状态:</div>
          <div class="data-value status-highlight">{{ currentStatusText }}</div>
        </div>
        <div class="data-row">
          <div class="data-label">当前位置:</div>
          <div class="data-value">{{ currentStation ? currentStation.name : '未知' }} → {{ nextStation ? nextStation.name : '未知' }}</div>
        </div>
        <div class="data-row">
          <div class="data-label">当前时间:</div>
          <div class="data-value time-highlight">{{ formatCurrentTime }}</div>
        </div>
      </div>
      
      <div class="details-section">
        <div class="section-title">最近记录</div>
        <table class="records-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>站点</th>
              <th>事件</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(record, index) in getLatestRecords()" :key="index">
              <td>{{ formatTimestamp(record.timestamp) }}</td>
              <td>{{ record.stationName }}</td>
              <td>{{ getEventTypeText(record.eventType) }}</td>
            </tr>
            <tr v-if="getLatestRecords().length === 0">
              <td colspan="3" class="no-data">暂无运行记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f2f2f7;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.ios-back-button {
  display: flex;
  align-items: center;
  color: #007aff;
  font-size: 17px;
}

.home-icon {
  width: 22px;
  height: 22px;
  color: #007aff;
}

.details-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.details-section {
  background-color: white;
  border-radius: 12px;
  margin-bottom: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #8e8e93;
}

.data-row {
  display: flex;
  margin-bottom: 12px;
}

.data-label {
  flex: 0 0 100px;
  color: #8e8e93;
  font-size: 15px;
}

.data-value {
  flex: 1;
  font-size: 15px;
}

.status-highlight {
  color: #007aff;
  font-weight: 500;
}

.time-highlight {
  color: #ff9500;
  font-weight: 500;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.records-table th {
  text-align: left;
  padding: 8px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  font-weight: 600;
  color: #8e8e93;
}

.records-table td {
  padding: 8px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.records-table tr:last-child td {
  border-bottom: none;
}

.no-data {
  text-align: center;
  color: #8e8e93;
  padding: 16px;
}
</style> 