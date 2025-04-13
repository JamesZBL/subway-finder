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
const currentStationIndex = ref(0)
const nextStationIndex = ref(1)

// 计时器
const timer = ref(null)
const refreshTick = ref(0)

// 获取站点列表
onMounted(() => {
  if (lineId.value && direction.value) {
    stations.value = getStationsForDirection(lineId.value, direction.value) || []
    
    // 找出当前站在列表中的位置
    if (stationName.value) {
      const index = stations.value.findIndex(s => s.name === stationName.value)
      if (index !== -1) {
        currentStationIndex.value = index
        nextStationIndex.value = Math.min(index + 1, stations.value.length - 1)
      }
    }
    
    // 只计算一次全程时间估算，不再定时更新
    calculateFullRouteEstimate()
  }
})

// 清理定时器
onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
})

// 获取当前线路信息
const currentLine = computed(() => {
  return subwayStore.getLineById(lineId.value) || { name: '' }
})

// 从store获取当前状态信息
const currentStation = computed(() => {
  return stations.value[currentStationIndex.value] || null
})

const nextStation = computed(() => {
  return stations.value[nextStationIndex.value] || null
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
  console.log('计算全程时间估算开始')
  
  if (!stations.value.length || !lineId.value || !currentStation.value) {
    console.log('缺少必要数据，无法计算全程时间估算')
    fullRouteEstimate.value = []
    return
  }
  
  // 获取当前状态和开始时间
  const result = []
  const now = new Date().getTime()
  let lastDepartureTime = null
  let startPointTime = now
  
  // 获取当前事件类型和开始时间
  const lastEvents = subwayStore.getRunningDataForLine(lineId.value, direction.value)
  const sortedEvents = [...lastEvents].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  
  // 获取最新的事件
  const latestEvent = sortedEvents[0]
  let eventType = null
  let startTime = null
  
  if (latestEvent) {
    eventType = latestEvent.eventType === 'arrival' ? 1 : 2
    startTime = new Date(latestEvent.timestamp).getTime()
    console.log('从历史数据获取当前状态:', 
      eventType === 1 ? '停车中' : '行驶中', 
      '开始时间:', formatTime(startTime))
  }
  
  // 如果没有找到事件，默认使用停车状态
  if (!eventType) {
    eventType = 1 // 默认停车状态
    console.log('没有找到历史数据，默认使用停车状态')
  }
  
  // 遍历所有站点，计算到达和发车时间
  for (let i = 0; i < stations.value.length; i++) {
    const station = stations.value[i]
    const stationInfo = {
      name: station.name,
      arrivalTime: '--:--:--',
      departureTime: '--:--:--',
      isCurrentStation: i === currentStationIndex.value,
      isNextStation: i === nextStationIndex.value
    }
    
    if (i === currentStationIndex.value) {
      // 如果是当前站点
      stationInfo.arrivalTime = '当前站点'
      
      // 如果当前是停车状态，计算发车时间
      if (eventType === 1 && startTime) {
        // 获取平均停车时间
        let stopTime = 30 * 1000 // 默认30秒
        const avgStopTime = subwayStore.calculateAverageStopTimeAtStation(
          lineId.value,
          station.name,
          direction.value
        )
        if (avgStopTime) {
          stopTime = avgStopTime
        }
        
        const elapsedTime = now - startTime
        const remainingTime = Math.max(0, stopTime - elapsedTime)
        
        if (remainingTime <= 0) {
          stationInfo.departureTime = '即将发车'
        } else {
          const departureTime = new Date(now + remainingTime)
          stationInfo.departureTime = formatTime(departureTime)
          lastDepartureTime = departureTime.getTime()
        }
      } 
      // 如果是行驶状态，那么这站已经发车
      else if (eventType === 2) {
        stationInfo.departureTime = '已发车'
        lastDepartureTime = startTime || startPointTime
      }
      // 如果既不是停车也不是行驶状态，可能是刚初始化
      else {
        stationInfo.departureTime = '未知'
      }
    }
    // 如果是下一站，并且当前是行驶状态，计算到达时间
    else if (i === nextStationIndex.value && eventType === 2 && startTime) {
      // 优先使用时刻表数据计算预计到达时间
      let runningTime = null;
      
      // 尝试从时刻表获取标准运行时间
      const standardTime = getStandardRunningTime(
        lineId.value,
        currentStation.value.name,
        nextStation.value.name,
        direction.value
      )
      
      if (standardTime) {
        runningTime = standardTime
      } else {
        // 尝试从历史数据获取平均运行时间
        runningTime = subwayStore.calculateAverageTimeBetweenStations(
          lineId.value,
          currentStation.value.name,
          nextStation.value.name,
          direction.value
        )
        
        if (!runningTime) {
          // 如果无法获取历史数据，使用默认90秒
          runningTime = 90 * 1000
        }
      }
      
      const elapsedTime = now - startTime
      const remainingTime = Math.max(0, runningTime - elapsedTime)
      
      if (remainingTime <= 0) {
        stationInfo.arrivalTime = '即将到站'
        console.log(`站点 ${station.name} 即将到站 - 已超出预计到站时间 ${Math.abs(remainingTime)/1000}秒`)
        
        // 修复：即将到站时，获取平均停车时间计算发车时间
        let stopTime = 30 * 1000 // 默认30秒
        const avgStopTime = subwayStore.calculateAverageStopTimeAtStation(
          lineId.value,
          station.name,
          direction.value
        )
        if (avgStopTime) {
          stopTime = avgStopTime
          console.log(`使用历史平均停车时间: ${stopTime/1000}秒`)
        } else {
          console.log(`使用默认停车时间: ${stopTime/1000}秒`)
        }
        
        // 计算实际已经到站的时间
        // 实际已到站时间 = 当前时间 - (已耗时间 - 运行时间) = 当前时间 - 超出时间
        const arrivalTimestamp = now - Math.abs(remainingTime)
        // 计算已经停车的时间
        const elapsedStopTime = now - arrivalTimestamp
        console.log(`估计已停车时间: ${elapsedStopTime/1000}秒, 总停车时间: ${stopTime/1000}秒`)
        
        // 如果已经停车时间超过平均停车时间，显示"即将发车"
        if (elapsedStopTime >= stopTime) {
          stationInfo.departureTime = '即将发车'
          console.log(`站点 ${station.name} 即将发车`)
        } else {
          // 否则计算剩余停车时间
          const remainingStopTime = stopTime - elapsedStopTime
          const departureTime = new Date(now + remainingStopTime)
          stationInfo.departureTime = formatTime(departureTime)
          lastDepartureTime = departureTime.getTime()
          console.log(`站点 ${station.name} 预计发车时间: ${formatTime(departureTime)}, 还需停车: ${remainingStopTime/1000}秒`)
        }
      } else {
        const arrivalTime = new Date(now + remainingTime)
        stationInfo.arrivalTime = formatTime(arrivalTime)
        console.log(`站点 ${station.name} 预计到达时间: ${formatTime(arrivalTime)}, 还需: ${remainingTime/1000}秒`)
        
        // 默认停站30秒
        let stopTime = 30 * 1000 // 默认30秒
        const avgStopTime = subwayStore.calculateAverageStopTimeAtStation(
          lineId.value,
          station.name,
          direction.value
        )
        if (avgStopTime) {
          stopTime = avgStopTime
          console.log(`使用历史平均停车时间: ${stopTime/1000}秒`)
        } else {
          console.log(`使用默认停车时间: ${stopTime/1000}秒`)
        }
        
        const departureTime = new Date(arrivalTime.getTime() + stopTime)
        stationInfo.departureTime = formatTime(departureTime)
        lastDepartureTime = departureTime.getTime()
        console.log(`站点 ${station.name} 预计发车时间: ${formatTime(departureTime)}`)
      }
    }
    // 如果是后续站点，且有前一站的发车时间，则可以计算
    else if (i > nextStationIndex.value && lastDepartureTime) {
      // 默认运行时间3分钟
      const defaultRunningTime = 3 * 60 * 1000
      // 计算从上一站到此站的运行时间
      let runningTime = defaultRunningTime
      
      // 尝试获取历史数据
      if (i > 0) {
        const prevStation = stations.value[i-1]
        // 尝试从时刻表获取标准运行时间
        const standardTime = getStandardRunningTime(
          lineId.value,
          prevStation.name,
          station.name,
          direction.value
        )
        
        if (standardTime) {
          runningTime = standardTime
        } else {
          // 尝试从历史数据获取平均运行时间
          const avgTime = subwayStore.calculateAverageTimeBetweenStations(
            lineId.value,
            prevStation.name,
            station.name,
            direction.value
          )
          
          if (avgTime) {
            runningTime = avgTime
          }
        }
      }
      
      // 计算到达时间
      const arrivalTime = new Date(lastDepartureTime + runningTime)
      stationInfo.arrivalTime = formatTime(arrivalTime)
      
      // 如果不是终点站，计算发车时间
      if (i < stations.value.length - 1) {
        // 默认停站30秒
        const departureTime = new Date(arrivalTime.getTime() + 30000)
        stationInfo.departureTime = formatTime(departureTime)
        lastDepartureTime = departureTime.getTime()
      } else {
        stationInfo.departureTime = '终点站'
      }
    }
    // 如果是之前的站点，已经过去了
    else if (i < currentStationIndex.value) {
      stationInfo.arrivalTime = '已过站'
      stationInfo.departureTime = '已发车'
    }
    
    result.push(stationInfo)
  }
  
  console.log(`计算完成，共生成${result.length}条站点时间估算`)
  fullRouteEstimate.value = result
}

// 刷新时间估算
const refreshEstimate = () => {
  calculateFullRouteEstimate()
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
      <h1 v-if="currentLine">{{ currentLine.name }}</h1>
      <div style="width: 65px; visibility: hidden;">占位</div>
      <div class="navbar-right" style="position: absolute; right: 10px; top: 0; height: 100%; display: flex; align-items: center; gap: 16px;">
        <div class="refresh-icon" @click="refreshEstimate">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M1 20v-6h6"></path>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </div>
        <div class="home-icon" @click="goToHome">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </div>
      </div>
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