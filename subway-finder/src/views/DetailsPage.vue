<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()

const lineId = ref(route.query.lineId)
const stationName = ref(route.query.stationName)
const direction = ref(route.query.direction)
const currentStatus = ref(route.query.currentStatus)

// 从store获取当前状态信息
const currentStation = computed(() => {
  return subwayStore.getCurrentStation(lineId.value, direction.value)
})

const nextStation = computed(() => {
  return subwayStore.getNextStation(lineId.value, currentStation.value?.name, direction.value)
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
  const date = new Date(parseInt(timestamp))
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 获取事件类型文本
const getEventTypeText = (eventType) => {
  if (eventType === 1) return '到站'
  if (eventType === 2) return '起步'
  return '未知'
}

// 获取最近运行记录
const getLatestRecords = () => {
  if (!lineId.value || !direction.value) return []
  return subwayStore.getRunningRecords(lineId.value, direction.value).slice(0, 10)
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
      <h1>运行详情</h1>
      <button class="home-button" @click="goToHome">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>
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

.no-data {
  text-align: center;
  color: #8e8e93;
  padding: 16px;
}
</style> 