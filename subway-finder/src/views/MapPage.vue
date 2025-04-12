<script setup>
import { ref, onMounted, computed, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'
import { getStationsForDirection, getDirectionsForLine } from '../data/stations'
import { getStandardRunningTime, getTotalRunningTime, getStandardStopTime } from '../data/timetable'
import toast from '../utils/toast'

const router = useRouter()
const route = useRoute()
const subwayStore = useSubwayStore()

const lineId = ref(route.query.lineId)
const stationName = ref(route.query.stationName)
const eventType = ref(route.query.eventType)
const direction = ref(route.query.direction)
const stations = ref([])
const directionInfo = ref(null)
const currentPosition = ref(0)
const currentStationIndex = ref(0)
const nextStationIndex = ref(1)
const updateInterval = ref(null)
const zoom = ref(1)
const hasShowedArrivalNotice = ref(false)
const showDetails = ref(false)
const startTime = ref(null)
const eventTypeCode = ref(null)

// 改进22: 添加地图拖动功能所需的状态变量
const isDragging = ref(false)
const startDragX = ref(0)
const startDragY = ref(0)
const mapOffsetX = ref(0)
const mapOffsetY = ref(0)

// 改进26: 添加计数器变量，用于触发计算属性更新
const timeRefresher = ref(0)

// 改进26: 添加时间刷新定时器的引用
const timeRefresherInterval = ref(null)

// 改进27: 添加是否显示全程时间估算的状态
const showFullRouteEstimate = ref(false)

// 改进27: 存储全程时间估算结果
const fullRouteEstimate = ref([])

// 定期更新时间显示
const startTimeRefresher = () => {
  // 每秒更新一次
  timeRefresherInterval.value = setInterval(() => {
    timeRefresher.value++
  }, 1000)
}

// 计算当前站点和下一站点
const currentStation = computed(() => {
  return stations.value[currentStationIndex.value] || null
})

const nextStation = computed(() => {
  return stations.value[nextStationIndex.value] || null
})

// 改进25: 添加终点站检查
const isTerminalStation = computed(() => {
  return currentStationIndex.value === stations.value.length - 1
})

// 改进21: 添加计算属性，显示当前状态
const currentStatusText = computed(() => {
  if (!currentStation.value) return '未开始运行'
  
  // 改进25: 添加终点站状态判断
  if (isTerminalStation.value) {
    return `已到达终点站 ${currentStation.value.name}`
  }
  
  // 根据eventTypeCode判断当前状态
  if (eventTypeCode.value === 1) { // 停车状态
    return `${currentStation.value.name}站停车中`
  } else if (eventTypeCode.value === 2 && nextStation.value) { // 行驶状态
    return `${currentStation.value.name}开往${nextStation.value.name}`
  } else {
    return `${currentStation.value.name}站`
  }
})

// 改进28: 添加格式化时间的通用函数，确保时间格式为 HH:mm:ss
const formatTimeWithSeconds = (date) => {
  if (!date || !(date instanceof Date)) return '未知'
  
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return `${hours}:${minutes}:${seconds}`
}

// 计算预计到达时间
const estimatedArrivalTime = computed(() => {
  // 改进26: 读取计数器变量，使计算属性能够自动更新
  const refreshTrigger = timeRefresher.value

  // 如果当前是停车状态，显示预计发车时间
  if (eventTypeCode.value === 1 && startTime.value && currentStation.value) {
    // 获取平均停车时间
    let stopTime = 30 * 1000 // 默认30秒
    const avgStopTime = subwayStore.calculateAverageStopTimeAtStation(
      lineId.value,
      currentStation.value.name,
      direction.value
    )
    if (avgStopTime) {
      stopTime = avgStopTime
    }
    
    const now = new Date().getTime()
    const elapsedTime = now - startTime.value
    const remainingTime = Math.max(0, stopTime - elapsedTime)
    
    if (remainingTime <= 0) {
      return '即将发车'
    } else {
      const departureTime = new Date(now + remainingTime)
      const diffInSeconds = Math.floor(remainingTime / 1000)
      
      if (diffInSeconds < 60) {
        // 改进28: 使用格式化函数确保时间格式正确
        return `预计发车：${formatTimeWithSeconds(departureTime)} (${diffInSeconds}秒后)`
      } else {
        const diffInMinutes = Math.floor(diffInSeconds / 60)
        // 改进28: 使用格式化函数确保时间格式正确
        return `预计发车：${formatTimeWithSeconds(departureTime)} (${diffInMinutes}分钟后)`
      }
    }
  } 
  // 如果当前是行驶状态，显示预计到达时间
  else if (eventTypeCode.value === 2 && startTime.value && currentStation.value && nextStation.value) {
    // 改进35: 优先使用时刻表数据计算预计到达时间
    let runningTime = null;
    
    // 尝试从时刻表获取标准运行时间
    console.log('尝试从时刻表获取标准运行时间计算预计到达时间')
    const standardTime = getStandardRunningTime(
      lineId.value,
      currentStation.value.name,
      nextStation.value.name,
      direction.value
    )
    
    if (standardTime) {
      runningTime = standardTime
      console.log('使用时刻表标准运行时间(毫秒):', runningTime)
    } else {
      // 尝试从历史数据获取平均运行时间
      runningTime = subwayStore.calculateAverageTimeBetweenStations(
        lineId.value,
        currentStation.value.name,
        nextStation.value.name,
        direction.value
      )
      
      if (runningTime) {
        console.log('使用历史平均运行时间(毫秒):', runningTime)
      } else {
        // 如果无法获取历史数据，使用默认90秒
        runningTime = 90 * 1000
        console.log('使用默认运行时间: 90秒')
      }
    }
    
    const now = new Date().getTime()
    const elapsedTime = now - startTime.value
    const remainingTime = Math.max(0, runningTime - elapsedTime)
    
    if (remainingTime <= 0) {
      return '即将到站'
    } else {
      const arrivalTime = new Date(now + remainingTime)
      const diffInSeconds = Math.floor(remainingTime / 1000)
      
      if (diffInSeconds < 60) {
        // 改进28: 使用格式化函数确保时间格式正确
        return `预计到站：${formatTimeWithSeconds(arrivalTime)} (${diffInSeconds}秒后)`
      } else {
        const diffInMinutes = Math.floor(diffInSeconds / 60)
        // 改进28: 使用格式化函数确保时间格式正确
        return `预计到站：${formatTimeWithSeconds(arrivalTime)} (${diffInMinutes}分钟后)`
      }
    }
  }
  
  return '未知状态'
})

// 计算实际运行进度
const calculateRealProgress = (startTimeParam = null, typeParam = null, currentStationName = null, nextStationName = null) => {
  console.log('计算实际运行进度开始:', { 
    startTimeParam, 
    typeParam, 
    currentStationName, 
    nextStationName,
    lineId: lineId.value,
    direction: direction.value,
    storedStartTime: startTime.value,
    storedEventType: eventTypeCode.value
  })
  
  // 如果没有传入站点名称，尝试从计算属性中获取
  const usedCurrentStationName = currentStationName || (currentStation.value ? currentStation.value.name : null)
  const usedNextStationName = nextStationName || (nextStation.value ? nextStation.value.name : null)
  
  if (!usedCurrentStationName || !usedNextStationName) {
    console.log('当前站点或下一站点为空，返回0')
    return 0
  }
  
  // 使用传入的参数或已存储的状态值
  const usedStartTime = startTimeParam || startTime.value
  const usedType = typeParam || eventTypeCode.value
  
  console.log('使用的参数:', { 
    usedStartTime, 
    usedType, 
    usedCurrentStationName,
    usedNextStationName,
    // 改进28: 使用格式化函数确保时间格式正确
    usedStartTimeFormatted: usedStartTime ? formatTimeWithSeconds(new Date(usedStartTime)) : null,
    typeDescription: usedType === 1 ? '停车' : usedType === 2 ? '起步' : '未知'
  })
  
  // 如果没有开始时间或类型，使用旧的计算方式
  if (!usedStartTime || !usedType) {
    console.log('没有开始时间或类型，使用旧的计算方式')
    // 使用旧的计算位置函数
    const progress = subwayStore.calculateTrainPosition(
      lineId.value,
      usedCurrentStationName,
      usedNextStationName,
      direction.value
    )
    
    console.log('旧计算方式返回进度:', progress)
    // 改进20: 统一处理进度超过100%的情况
    return progress >= 100 ? 100 : progress
  }
  
  // 获取当前时间
  const now = new Date().getTime()
  // 改进28: 使用格式化函数确保时间格式正确
  console.log('当前时间:', formatTimeWithSeconds(new Date(now)))
  
  // 计算经过的时间（毫秒）
  const elapsedTime = now - usedStartTime
  console.log('经过的时间(毫秒):', elapsedTime, '经过的时间(秒):', (elapsedTime/1000).toFixed(2))
  
  // 根据类型执行不同的计算
  if (usedType === 2) { // 起步
    console.log('计算起步后的进度')
    
    // 改进35: 首先尝试从时刻表获取标准运行时间
    console.log('尝试从时刻表获取标准运行时间')
    const standardTime = getStandardRunningTime(
      lineId.value,
      usedCurrentStationName,
      usedNextStationName,
      direction.value
    )
    
    if (standardTime) {
      console.log('获取到的标准运行时间(毫秒):', standardTime, '标准运行时间(秒):', (standardTime/1000).toFixed(2))
      
      // 计算进度百分比: 经过时间 / 标准运行时间
      const progress = (elapsedTime / standardTime) * 100
      console.log('根据时刻表计算进度: 经过时间/标准运行时间 =', elapsedTime, '/', standardTime, '=', progress.toFixed(2) + '%')
      
      // 改进20: 统一处理进度超过100%的情况
      if (progress >= 100) {
        console.log('进度达到或超过100%，表示状态需要变化')
        return 100 // 返回精确的100，表示需要状态变化
      }
      
      const finalProgress = Math.max(0, Math.min(100, progress))
      console.log('最终进度(限制在0-100范围内):', finalProgress.toFixed(2) + '%')
      return finalProgress
    }
    
    // 若无法从时刻表获取，则尝试获取历史平均运行时间
    // 获取从当前站到下一站的平均运行时间（毫秒）
    const avgTime = subwayStore.calculateAverageTimeBetweenStations(
      lineId.value,
      usedCurrentStationName,
      usedNextStationName,
      direction.value
    )
    
    console.log('平均运行时间(毫秒):', avgTime, '平均运行时间(秒):', avgTime ? (avgTime/1000).toFixed(2) : null)
    
    // 如果有平均运行时间数据，使用它计算进度
    if (avgTime) {
      // 计算进度百分比: 经过时间 / 平均运行时间
      const progress = (elapsedTime / avgTime) * 100
      console.log('计算进度: 经过时间/平均运行时间 =', elapsedTime, '/', avgTime, '=', progress.toFixed(2) + '%')
      
      // 确保进度在0-100范围内
      // 改进20: 统一处理进度超过100%的情况
      if (progress >= 100) {
        console.log('进度达到或超过100%，表示状态需要变化')
        return 100 // 返回精确的100，表示需要状态变化
      }
      
      const finalProgress = Math.max(0, Math.min(100, progress))
      console.log('最终进度(限制在0-100范围内):', finalProgress.toFixed(2) + '%')
      return finalProgress
    }
    
    // 改进30: 如果没有历史数据，使用默认的90秒作为运行时间，但返回有效的进度值
    // 而不是返回0，这样可以避免重置为始发站
    const defaultRunningTime = 90 * 1000 // 90秒（毫秒）
    const progress = (elapsedTime / defaultRunningTime) * 100
    console.log('无历史数据，使用默认90秒运行时间，进度计算:', elapsedTime, '/', defaultRunningTime, '=', progress.toFixed(2) + '%')
    
    // 改进20: 统一处理进度超过100%的情况
    if (progress >= 100) {
      console.log('进度达到或超过100%，表示状态需要变化')
      return 100 // 返回精确的100，表示需要状态变化
    }
    
    const finalProgress = Math.max(0.1, Math.min(100, progress))  // 确保至少返回0.1，避免被视为无进度数据
    console.log('最终进度(限制在0.1-100范围内，避免重置):', finalProgress.toFixed(2) + '%')
    return finalProgress
  } else if (usedType === 1) { // 停车
    console.log('计算停车进度')
    
    // 改进36: 优先使用时刻表中的标准停车时间
    console.log('尝试从时刻表获取标准停车时间')
    const standardStopTime = getStandardStopTime(
      lineId.value,
      usedCurrentStationName,
      direction.value
    )
    
    if (standardStopTime) {
      console.log('获取到的标准停车时间(毫秒):', standardStopTime, '标准停车时间(秒):', (standardStopTime/1000).toFixed(2))
      
      // 计算进度百分比: 经过时间 / 标准停车时间
      const progress = (elapsedTime / standardStopTime) * 100
      console.log('根据时刻表计算停车进度: 经过时间/标准停车时间 =', elapsedTime, '/', standardStopTime, '=', progress.toFixed(2) + '%')
      
      // 改进20: 统一处理进度超过100%的情况
      if (progress >= 100) {
        console.log('停车时间已满，需要改变状态为起步')
        return 100 // 返回精确的100，表示需要状态变化
      }
      
      const finalProgress = Math.max(0, Math.min(100, progress))
      console.log('最终停车进度(限制在0-100范围内):', finalProgress.toFixed(2) + '%')
      return finalProgress
    }
    
    // 如果无法从时刻表获取，则尝试从历史数据获取平均停车时间
    // 改进24: 使用历史数据计算停车进度
    // 获取该站点的平均停车时间
    const avgStopTime = subwayStore.calculateAverageStopTimeAtStation(
      lineId.value,
      usedCurrentStationName,
      direction.value
    )
    
    console.log('平均停车时间(毫秒):', avgStopTime, '平均停车时间(秒):', avgStopTime ? (avgStopTime/1000).toFixed(2) : null)
    
    // 如果有平均停车时间数据，使用它计算进度
    if (avgStopTime) {
      // 计算进度百分比: 经过时间 / 平均停车时间
      const progress = (elapsedTime / avgStopTime) * 100
      console.log('计算停车进度: 经过时间/平均停车时间 =', elapsedTime, '/', avgStopTime, '=', progress.toFixed(2) + '%')
      
      // 改进20: 统一处理进度超过100%的情况
      if (progress >= 100) {
        console.log('停车时间已满，需要改变状态为起步')
        return 100 // 返回精确的100，表示需要状态变化
      }
      
      const finalProgress = Math.max(0, Math.min(100, progress))
      console.log('最终停车进度(限制在0-100范围内):', finalProgress.toFixed(2) + '%')
      return finalProgress
    }
    
    // 如果历史数据也没有，使用默认的30秒作为停车时间
    // 改进30: 如果没有历史数据，使用默认的30秒作为停车时间
    const defaultStopTime = 30 * 1000 // 30秒（毫秒）
    const progress = (elapsedTime / defaultStopTime) * 100
    console.log('无历史数据，使用默认30秒停车时间，进度计算:', elapsedTime, '/', defaultStopTime, '=', progress.toFixed(2) + '%')
    
    // 改进20: 统一处理进度超过100%的情况
    if (progress >= 100) {
      console.log('停车时间已满，需要改变状态为起步')
      return 100 // 返回精确的100，表示需要状态变化
    }
    
    const finalProgress = Math.max(0.1, Math.min(100, progress)) // 确保至少返回0.1，避免被视为无进度数据
    console.log('最终进度(限制在0.1-100范围内，避免重置):', finalProgress.toFixed(2) + '%')
    return finalProgress
  }
  
  console.log('未知类型，返回小值0.1而非0，以避免重置')
  return 0.1 // 改进30: 返回一个小值而不是0，避免被updateTrainPosition视为无进度数据
}

// 获取线路颜色
const lineColor = computed(() => {
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
  return colors[lineId.value] || '#666666'
})

// 更新列车位置
const updateTrainPosition = () => {
  // 改进25: 到达终点站后不再更新位置
  if (isTerminalStation.value) {
    console.log('已到达终点站，停止位置更新')
    return
  }

  // 改进26: 使用计算属性获取实时进度
  const realProgress = getCurrentProgress.value
  console.log('更新列车位置，计算得到的进度:', realProgress.toFixed(2) + '%')
  
  // 如果有进度数据，直接使用
  if (realProgress > 0) {
    currentPosition.value = realProgress
    
    // 如果接近到站，显示提示
    if (realProgress > 95 && !hasShowedArrivalNotice.value && currentStation.value && nextStation.value) {
      console.log('列车接近到站，显示通知:', nextStation.value.name)
      toast.info(`${nextStation.value.name}即将到站`, 3000)
      hasShowedArrivalNotice.value = true
    }
  } else {
    // 没有进度数据时（可能是没有历史数据），模拟列车运行
    // 默认区间运行时间为90秒，模拟慢慢运行（100ms更新一次，增加约0.11%的进度）
    const defaultTimeInSeconds = 90
    const updateIntervalInMs = 100
    const progressPerUpdate = (updateIntervalInMs / (defaultTimeInSeconds * 1000)) * 100
    
    console.log('无实际进度数据，使用模拟进度更新，增加:', progressPerUpdate.toFixed(4) + '%')
    
    // 改进30: 如果当前已经在运行中，继续累加进度，否则重置为0并开始累加
    if (eventTypeCode.value === 2 && startTime.value) {
      currentPosition.value += progressPerUpdate
    } else {
      console.log('没有有效的行驶状态，重置进度为0')
      currentPosition.value = 0
    }
  }
  
  // 如果到达下一站或进度条满
  if (currentPosition.value >= 100) {
    // 改进20: 根据当前状态判断下一步应该做什么
    
    // 如果当前是起步状态（类型码=2），表示列车行驶结束到达了下一站
    if (eventTypeCode.value === 2) { // 当前是起步状态（行驶中）
      console.log('列车到达下一站:', nextStation.value?.name)
      currentPosition.value = 0
      hasShowedArrivalNotice.value = false
      
      // 记录旧的当前站点名称，用于日志
      const oldCurrentStationName = currentStation.value ? currentStation.value.name : null
      
      // 改进30: 仅在下一站点存在时才更新站点索引
      if (nextStation.value) {
        // 更新站点索引
        currentStationIndex.value = nextStationIndex.value
        nextStationIndex.value = Math.min(nextStationIndex.value + 1, stations.value.length - 1)
        
        // 刷新开始时间为当前时间，并设置事件类型为到站（类型码=1）
        startTime.value = new Date().getTime()
        eventTypeCode.value = 1 // 更新为停车类型
        
        console.log('状态更新 - 行驶结束，到达新站点:', { 
          oldStation: oldCurrentStationName,
          newStation: currentStation.value ? currentStation.value.name : null,
          newStartTime: formatTimeWithSeconds(new Date(startTime.value)),
          newEventType: '到站（类型码=1）'
        })
        
        // 显示到站提示
        if (currentStation.value) {
          console.log('显示到站提示:', currentStation.value.name)
          toast.success(`${currentStation.value.name}已到站`, 3000)
          
          // 改进25: 检查是否到达终点站
          if (isTerminalStation.value) {
            console.log('已到达终点站，显示终点站通知')
            toast.info(`已到达终点站 ${currentStation.value.name}`, 5000)
          }
        }
      } else {
        console.log('错误：下一站点不存在，无法更新站点索引')
        // 重置进度条但保持当前状态
        currentPosition.value = 0
      }
    } 
    // 如果当前是停车状态（类型码=1），表示停车时间已满，列车即将起步
    else if (eventTypeCode.value === 1) { // 当前是停车状态
      console.log('停车时间已满，列车准备起步:', currentStation.value?.name)
      currentPosition.value = 0
      
      // 改进30: 仅在下一站点存在时才设置起步状态
      if (nextStation.value) {
        // 刷新开始时间为当前时间，并设置事件类型为起步（类型码=2）
        startTime.value = new Date().getTime()
        eventTypeCode.value = 2 // 更新为起步类型
        
        console.log('状态更新 - 停车结束，开始起步:', { 
          station: currentStation.value ? currentStation.value.name : null,
          newStartTime: formatTimeWithSeconds(new Date(startTime.value)),
          newEventType: '起步（类型码=2）'
        })
        
        // 显示起步提示
        if (currentStation.value) {
          console.log('显示起步提示:', currentStation.value.name)
          toast.success(`${currentStation.value.name}已起步`, 3000)
        }
      } else {
        console.log('错误：下一站点不存在，无法开始起步')
        // 保持停车状态
        eventTypeCode.value = 1
      }
    }
    // 如果eventTypeCode为其他值或未定义，重置进度
    else {
      console.log('未知状态，重置进度:', eventTypeCode.value)
      currentPosition.value = 0
    }
  }
}

// 在组件挂载时初始化数据
onMounted(() => {
  console.log('组件挂载，初始化数据:', {
    lineId: lineId.value,
    direction: direction.value,
    stationName: stationName.value,
    eventType: eventType.value
  })

  // 改进26: 启动时间刷新器
  startTimeRefresher()

  if (lineId.value && direction.value) {
    const line = subwayStore.getLineById(lineId.value)
    if (line) {
      console.log('设置当前线路:', line.name)
      subwayStore.setCurrentLine(line)
    }
    
    stations.value = getStationsForDirection(lineId.value, direction.value)
    console.log('获取方向上的站点数量:', stations.value.length)
    
    // 获取方向信息
    const directions = getDirectionsForLine(lineId.value)
    directionInfo.value = directions.find(dir => dir.id === direction.value)
    if (directionInfo.value) {
      console.log('设置方向信息:', directionInfo.value.name)
      subwayStore.setCurrentDirection(directionInfo.value)
    }
    
    // 找到起始站点的索引
    if (stationName.value) {
      const index = stations.value.findIndex(s => s.name === stationName.value)
      console.log('找到起始站点索引:', index, '站点名称:', stationName.value)
      
      if (index >= 0) {
        currentStationIndex.value = index
        nextStationIndex.value = Math.min(index + 1, stations.value.length - 1)
        console.log('设置当前站点索引:', currentStationIndex.value, '下一站点索引:', nextStationIndex.value)
        
        // 改进25: 检查是否是终点站
        if (currentStationIndex.value === stations.value.length - 1) {
          console.log('初始站点是终点站:', currentStation.value?.name)
          eventTypeCode.value = 1 // 设为停车状态
          // 如果是终点站，不需要设置开始时间，因为不会再有状态变化
        } else {
          // 记录当前时间作为开始时间
          startTime.value = new Date().getTime()
          // 改进28: 使用格式化函数确保时间格式正确
          console.log('记录开始时间:', formatTimeWithSeconds(new Date(startTime.value)))
          
          // 如果是到站事件，显示到站提示
          if (eventType.value === 'arrival' && currentStation.value) {
            console.log('处理到站事件:', currentStation.value.name)
            toast.success(`${currentStation.value.name}已到站`, 3000)
            eventTypeCode.value = 1 // 停车类型
          } 
          // 如果是起步事件，显示起步提示
          else if (eventType.value === 'departure' && currentStation.value) {
            console.log('处理起步事件:', currentStation.value.name)
            toast.success(`${currentStation.value.name}已起步`, 3000)
            eventTypeCode.value = 2 // 起步类型
          }
          console.log('设置事件类型码:', eventTypeCode.value)
        }
      }
    }
    
    // 添加一个标记，用于控制即将到站的通知
    hasShowedArrivalNotice.value = false
    
    // 启动定时器，更新列车位置
    console.log('启动定时器，更新列车位置')
    updateInterval.value = setInterval(updateTrainPosition, 100)
  } else {
    console.log('缺少必要参数：lineId或direction为空')
  }
})

// 在组件销毁前清除定时器
onBeforeUnmount(() => {
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
  
  // 改进26: 清除时间刷新定时器
  if (timeRefresherInterval.value) {
    clearInterval(timeRefresherInterval.value)
  }
})

// 返回上一页
const goBack = () => {
  router.go(-1)
}

// 返回首页
const goToHome = () => {
  router.push('/')
}

// 切换线路
const switchLine = () => {
  router.push({
    path: '/lines',
    query: { mode: 'display' }
  })
}

// 调整缩放级别
const adjustZoom = (amount) => {
  const oldZoom = zoom.value
  zoom.value = Math.max(0.5, Math.min(10, zoom.value + amount))
  
  // 改进22: 如果缩小到最小值，重置位置偏移
  if (zoom.value <= 1 && oldZoom > 1) {
    mapOffsetX.value = 0
    mapOffsetY.value = 0
  }
  
  const action = amount > 0 ? '放大' : '缩小'
  toast.info(`地图${action}至${Math.round(zoom.value * 100)}%`, 2000)
}

// 切换显示详细信息
const toggleDetails = () => {
  showDetails.value = !showDetails.value
  toast.info(showDetails.value ? '显示详细信息' : '隐藏详细信息', 2000)
}

// 获取最新的运行记录
const getLatestRecords = () => {
  const dataKey = direction.value ? `${lineId.value}-${direction.value}` : lineId.value
  const records = subwayStore.runningData[dataKey] || []
  
  // 按时间排序，最新的在前
  return [...records].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 5) // 仅返回最新的5条记录
}

// 格式化时间戳
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  // 改进28: 使用格式化函数确保时间格式正确
  return formatTimeWithSeconds(date)
}

// 获取事件类型的中文描述
const getEventTypeText = (type) => {
  return type === 'arrival' ? '到站' : '起步'
}

// 计算当前实时进度（用于模板中的展示）
const getCurrentProgress = computed(() => {
  // 改进26: 读取计数器变量，使计算属性能够自动更新
  const refreshTrigger = timeRefresher.value
  
  return calculateRealProgress(
    startTime.value,  // 起始时间
    eventTypeCode.value,  // 事件类型码：1=停车，2=起步
    currentStation.value ? currentStation.value.name : null,  // 当前站点名称
    nextStation.value ? nextStation.value.name : null  // 下一站点名称
  )
})

// 改进26: 格式化时间为当前时间
const formatCurrentTime = computed(() => {
  // 使用计数器触发更新
  const refreshTrigger = timeRefresher.value
  // 改进28: 使用格式化函数确保时间格式正确
  return formatTimeWithSeconds(new Date())
})

// 改进26: 计算当前进度的实时字符串表示
const progressText = computed(() => {
  // 使用计数器触发更新
  const refreshTrigger = timeRefresher.value
  
  if (isTerminalStation.value) {
    return '已到达终点站'
  }
  
  return `${Math.round(currentPosition.value)}%`
})

// 改进22: 添加地图拖动功能的相关方法
// 开始拖动地图
const startDragMap = (event) => {
  // 只有当地图放大时才允许拖动
  if (zoom.value <= 1) return
  
  isDragging.value = true
  
  // 支持鼠标和触摸事件
  if (event.type === 'touchstart') {
    startDragX.value = event.touches[0].clientX - mapOffsetX.value
    startDragY.value = event.touches[0].clientY - mapOffsetY.value
  } else {
    startDragX.value = event.clientX - mapOffsetX.value
    startDragY.value = event.clientY - mapOffsetY.value
    // 改变鼠标样式
    document.body.style.cursor = 'grabbing'
  }
}

// 拖动地图
const dragMap = (event) => {
  if (!isDragging.value) return
  
  // 阻止默认行为，防止在拖动时滚动页面
  event.preventDefault()
  
  // 计算新的偏移量
  if (event.type === 'touchmove') {
    mapOffsetX.value = event.touches[0].clientX - startDragX.value
    mapOffsetY.value = event.touches[0].clientY - startDragY.value
  } else {
    mapOffsetX.value = event.clientX - startDragX.value
    mapOffsetY.value = event.clientY - startDragY.value
  }
}

// 停止拖动地图
const stopDragMap = () => {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  // 恢复鼠标样式
  document.body.style.cursor = 'default'
}

// 重置地图位置
const resetMapPosition = () => {
  mapOffsetX.value = 0
  mapOffsetY.value = 0
  zoom.value = 1
  toast.info('重置地图位置', 2000)
}

// 改进27: 计算全程预计到达时间
const calculateFullRouteEstimate = () => {
  if (!lineId.value || !direction.value || !currentStation.value) {
    console.log('缺少必要数据，无法计算全程预计时间')
    return []
  }
  
  const result = []
  const now = new Date().getTime()
  let lastDepartureTime = null
  let startPointTime = null
  
  // 获取方向上的所有站点
  const allStations = getStationsForDirection(lineId.value, direction.value)
  if (!allStations || allStations.length === 0) {
    console.log('无法获取站点列表')
    return []
  }
  
  // 设置起始计算点
  if (eventTypeCode.value === 1) { // 当前在停车
    // 当前时间作为基准点
    startPointTime = now
  } else if (eventTypeCode.value === 2 && startTime.value) { // 当前在行驶
    // 起步时间作为基准点
    startPointTime = startTime.value
  } else {
    // 无法计算
    console.log('当前状态不明确，无法计算全程预计时间')
    return []
  }
  
  // 遍历所有站点，计算到达和发车时间
  for (let i = 0; i < allStations.length; i++) {
    const station = allStations[i]
    const stationInfo = {
      name: station.name,
      arrivalTime: '未知',
      departureTime: '未知'
    }
    
    if (i === currentStationIndex.value) {
      // 如果是当前站点
      stationInfo.arrivalTime = '当前站点'
      
      // 如果当前是停车状态，计算发车时间
      if (eventTypeCode.value === 1 && startTime.value) {
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
        
        const now = new Date().getTime()
        const elapsedTime = now - startTime.value
        const remainingTime = Math.max(0, stopTime - elapsedTime)
        
        if (remainingTime <= 0) {
          stationInfo.departureTime = '即将发车'
        } else {
          // 改进28: 使用格式化函数确保时间格式正确
          const departureTime = new Date(now + remainingTime)
          stationInfo.departureTime = formatTimeWithSeconds(departureTime)
          lastDepartureTime = departureTime.getTime()
        }
      } 
      // 如果是行驶状态，那么这站已经发车
      else if (eventTypeCode.value === 2) {
        stationInfo.departureTime = '已发车'
        lastDepartureTime = startTime.value || startPointTime
      }
      // 如果既不是停车也不是行驶状态，可能是刚初始化
      else {
        stationInfo.departureTime = '未知'
      }
    }
    // 如果是下一站，并且当前是行驶状态，计算到达时间
    else if (i === nextStationIndex.value && eventTypeCode.value === 2 && startTime.value) {
      // 改进35: 优先使用时刻表数据计算预计到达时间
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
      
      const now = new Date().getTime()
      const elapsedTime = now - startTime.value
      const remainingTime = Math.max(0, runningTime - elapsedTime)
      
      if (remainingTime <= 0) {
        stationInfo.arrivalTime = '即将到站'
      } else {
        // 改进28: 使用格式化函数确保时间格式正确
        const arrivalTime = new Date(now + remainingTime)
        stationInfo.arrivalTime = formatTimeWithSeconds(arrivalTime)
        
        // 默认停站30秒
        const departureTime = new Date(arrivalTime.getTime() + 30000)
        stationInfo.departureTime = formatTimeWithSeconds(departureTime)
        lastDepartureTime = departureTime.getTime()
      }
    }
    // 如果是后续站点，且有前一站的发车时间，则可以计算
    else if (i > nextStationIndex.value && lastDepartureTime) {
      let totalRunningTime = null
      
      // 改进35: 优先使用时刻表计算总运行时间
      if (eventTypeCode.value === 2 && startTime.value) {
        // 如果是行驶状态，需要考虑到已经行驶的时间
        // 计算从当前站到目标站的总运行时间
        const intermediateStations = allStations.slice(currentStationIndex.value, i + 1)
        let totalTime = 0
        
        // 计算各段运行时间
        for (let j = 0; j < intermediateStations.length - 1; j++) {
          const fromSt = intermediateStations[j].name
          const toSt = intermediateStations[j + 1].name
          
          // 改进35: 优先使用时刻表数据
          const segmentTime = getStandardRunningTime(lineId.value, fromSt, toSt, direction.value) || 
                          subwayStore.calculateAverageTimeBetweenStations(lineId.value, fromSt, toSt, direction.value) ||
                          (3 * 60 * 1000) // 默认3分钟
          
          totalTime += segmentTime
          
          // 如果不是最后一站，加上停站时间（默认30秒）
          if (j < intermediateStations.length - 2) {
            totalTime += 30000
          }
        }
        
        // 计算已经行驶的时间
        const now = new Date().getTime()
        const elapsedTime = now - startTime.value
        
        // 减去已行驶时间
        totalRunningTime = Math.max(0, totalTime - elapsedTime)
      } else {
        // 如果是其他状态或无起步时间，则从上一个有发车时间的站计算
        const prevStationIndex = result.findIndex(item => item.departureTime !== '未知' && item.departureTime !== '已发车')
        
        if (prevStationIndex !== -1) {
          const prevStation = allStations[prevStationIndex]
          
          // 改进35: 优先使用时刻表数据计算总运行时间
          totalRunningTime = getTotalRunningTime(lineId.value, prevStation.name, station.name, direction.value)
          
          if (!totalRunningTime) {
            // 如果无法从时刻表获取，使用默认值
            totalRunningTime = (i - prevStationIndex) * 3 * 60 * 1000  // 每站默认3分钟
          }
        }
      }
      
      if (totalRunningTime !== null) {
        const baseTime = lastDepartureTime
        // 改进28: 使用格式化函数确保时间格式正确
        const arrivalTime = new Date(baseTime + totalRunningTime)
        stationInfo.arrivalTime = formatTimeWithSeconds(arrivalTime)
        
        // 如果不是终点站，计算发车时间（默认停站30秒）
        if (i < allStations.length - 1) {
          // 改进28: 使用格式化函数确保时间格式正确
          const departureTime = new Date(arrivalTime.getTime() + 30000)
          stationInfo.departureTime = formatTimeWithSeconds(departureTime)
          lastDepartureTime = departureTime.getTime()
        } else {
          stationInfo.departureTime = '终点站'
        }
      }
    }
    
    result.push(stationInfo)
  }
  
  return result
}

// 切换显示全程估算时间
const toggleFullRouteEstimate = () => {
  showFullRouteEstimate.value = !showFullRouteEstimate.value
  
  if (showFullRouteEstimate.value) {
    // 计算全程预计到达时间
    fullRouteEstimate.value = calculateFullRouteEstimate()
    toast.info('显示全程运行时间估算', 2000)
  } else {
    toast.info('隐藏全程运行时间估算', 2000)
  }
}

// 改进27: 更新估算时间，实时反映最新数据
const updateFullRouteEstimate = computed(() => {
  // 使用计数器触发更新
  const refreshTrigger = timeRefresher.value
  
  if (showFullRouteEstimate.value) {
    fullRouteEstimate.value = calculateFullRouteEstimate()
  }
  
  return fullRouteEstimate.value
})

// 修改calculateTrainPosition计算方法，确保正确计算位置
const calculateTrainPosition = computed(() => {
  if (!currentStation.value || !nextStation.value) {
    // 如果缺少站点信息，使用当前站点坐标
    console.log('缺少站点信息，使用当前站点坐标', currentStation.value)
    return currentStation.value ? currentStation.value.position : [0, 0]
  }

  // 获取当前站点和下一站点坐标
  const currentPos = currentStation.value.position
  const nextPos = nextStation.value.position
  
  // 如果坐标无效，返回默认值
  if (!currentPos || !currentPos[0] || !currentPos[1]) {
    console.log('当前站点坐标无效', currentStation.value.name, currentPos)
    return [0, 0]
  }
  
  // 如果下一站坐标无效且不是终点站，使用当前站点坐标
  if ((!nextPos || !nextPos[0] || !nextPos[1]) && !isTerminalStation.value) {
    console.log('下一站点坐标无效', nextStation.value.name, nextPos)
    return currentPos
  }
  
  console.log('计算列车实际位置', currentPos, nextPos, currentPosition.value)

  // 如果当前处于终点站
  if (isTerminalStation.value) {
    console.log('当前处于终点站，返回当前站点坐标', currentPos)
    return currentPos
  }
  
  // 计算列车实际位置
  // 根据当前百分比计算列车在两站之间的位置
  if (eventTypeCode.value === 2) { // 在行驶中
    // 计算插值的坐标
    const x = currentPos[0] + (nextPos[0] - currentPos[0]) * currentPosition.value / 100
    const y = currentPos[1] + (nextPos[1] - currentPos[1]) * currentPosition.value / 100
    console.log('计算列车实际位置', x, y)
    return [x, y]
  } else {
    // 停车中，直接返回当前站点坐标
    console.log('当前处于停车状态，返回当前站点坐标', currentPos)
    return currentPos
  }
})
</script>

<template>
  <div class="map-container">
    <!-- 头部区域 -->
    <div class="header-with-actions">
      <button class="back-button" @click="goBack">
        <span>←</span>
      </button>
      <div class="title-container" v-if="subwayStore.currentLine">
        <h2 class="page-title">{{ subwayStore.currentLine.name }} 实时位置</h2>
        <div class="direction-info" v-if="directionInfo">
          {{ directionInfo.name }}
        </div>
      </div>
      <div class="actions-container">
        <button class="home-button" @click="goToHome" title="返回首页">
          <span>🏠</span>
        </button>
        <button class="action-button" @click="toggleDetails">
          {{ showDetails ? '隐藏详情' : '查看详情' }}
        </button>
        <button class="action-button estimate-button" @click="toggleFullRouteEstimate">
          {{ showFullRouteEstimate ? '隐藏估算' : '全程估算' }}
        </button>
        <button class="switch-line-button" @click="switchLine">
          切换线路
        </button>
      </div>
    </div>
    
    <!-- 站点和进度区域 - 完全独立于地图 -->
    <div class="status-panel">
      <div class="station-info-compact">
        <div class="station-column">
          <div class="station-label">当前站点</div>
          <div class="station-value">{{ currentStation ? currentStation.name : '-' }}</div>
        </div>
        <div class="divider"></div>
        <div class="station-column">
          <div class="station-label">下一站点</div>
          <div class="station-value">{{ nextStation ? nextStation.name : '-' }}</div>
        </div>
        <div class="divider"></div>
        <div class="station-column arrival-column">
          <div class="station-label">预计到达</div>
          <div class="station-value" :class="{'arriving-soon': estimatedArrivalTime && (estimatedArrivalTime.includes('即将到站') || estimatedArrivalTime.includes('即将发车'))}">
            {{ estimatedArrivalTime || '-' }}
          </div>
        </div>
      </div>
      
      <!-- 改进21: 添加当前状态显示 -->
      <div class="current-status">
        <div class="status-icon" :class="{ 
          'status-stopping': eventTypeCode === 1, 
          'status-running': eventTypeCode === 2,
          'status-terminal': isTerminalStation
        }">
          <span v-if="isTerminalStation">🏁</span>
          <span v-else-if="eventTypeCode === 1">🚉</span>
          <span v-else-if="eventTypeCode === 2">🚄</span>
          <span v-else>🚇</span>
        </div>
        <div class="status-text">{{ currentStatusText }}</div>
      </div>
      
      <div class="progress-container">
        <div class="station-labels station-labels-top">
          <span class="station-label" v-if="currentStation">
            {{ currentStation.name }}
          </span>
          <span class="station-progress" v-if="currentPosition > 0">
            {{ progressText }}
          </span>
          <span class="station-label" v-if="nextStation">
            {{ nextStation.name }}
          </span>
        </div>
        
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ 
              width: `${currentPosition}%`,
              backgroundColor: isTerminalStation ? '#4CAF50' : lineColor
            }"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- 改进27: 添加全程时间估算面板 -->
    <div class="estimate-panel" v-if="showFullRouteEstimate">
      <h3 class="estimate-title">全程运行时间估算</h3>
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
            <tr v-for="(station, index) in updateFullRouteEstimate" :key="index" 
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
            <tr v-if="!updateFullRouteEstimate.length">
              <td colspan="3" class="no-data">暂无估算数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 详细信息面板 -->
    <div class="details-panel" v-if="showDetails">
      <h3 class="details-title">运行详情</h3>
      <div class="details-content">
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
            <div class="data-label">运行进度:</div>
            <div class="data-value">{{ progressText }}</div>
          </div>
          <div class="data-row">
            <div class="data-label">预计时间:</div>
            <div class="data-value">{{ estimatedArrivalTime }}</div>
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
    
    <!-- 地图区域 - 独立的区域 -->
    <div class="map-section">
      <div class="map-wrapper"
           @mousedown="startDragMap"
           @mousemove="dragMap"
           @mouseup="stopDragMap"
           @mouseleave="stopDragMap"
           @touchstart="startDragMap"
           @touchmove="dragMap"
           @touchend="stopDragMap"
           @touchcancel="stopDragMap">
        <div class="map-controls">
          <button class="zoom-button" @click="() => adjustZoom(0.1)">+</button>
          <button class="zoom-button" @click="() => adjustZoom(-0.1)">-</button>
          <!-- 改进22: 添加重置按钮 -->
          <button class="zoom-button reset-button" @click="resetMapPosition" title="重置地图位置">R</button>
        </div>
        
        <div class="map-image" 
             :style="{ 
               transform: `scale(${zoom}) translate(${mapOffsetX / zoom}px, ${mapOffsetY / zoom}px)`,
               cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default')
             }">
          <img src="/images/Beijing Rail Transit Lines.png" alt="北京地铁线路图" class="subway-map">
          
          <!-- 改进33: 修正列车位置图标显示 -->
          <div class="train-position-marker" 
               v-if="currentStation && lineId && calculateTrainPosition[0] && calculateTrainPosition[1]"
               :style="{
                 left: `${calculateTrainPosition[0]}px`,
                 top: `${calculateTrainPosition[1]}px`,
                 color: lineColor
               }">
            🚄
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.header-with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  background-color: white;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.title-container {
  flex: 1;
  text-align: center;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
}

.direction-info {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.actions-container {
  display: flex;
  gap: 0.5rem;
}

.home-button, .action-button, .switch-line-button {
  background-color: #0052cc;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

/* 状态面板 - 完全独立区域 */
.status-panel {
  padding: 0.75rem;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.station-info-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  background-color: white;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 改进21: 添加当前状态样式 */
.current-status {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.status-stopping {
  background-color: #f0f0f0;
  color: #666;
}

.status-running {
  background-color: #e6f7ff;
  color: #0052cc;
}

/* 改进25: 添加终点站状态样式 */
.status-terminal {
  background-color: #e8f5e9;
  color: #4CAF50;
  font-weight: bold;
}

.status-text {
  font-weight: 500;
  color: #333;
  font-size: 0.95rem;
}

.station-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 0.5rem;
}

.divider {
  height: 30px;
  width: 1px;
  background-color: #eee;
}

.station-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.station-value {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.arrival-column {
  flex: 1.5;
}

.arriving-soon {
  color: #f44336;
  font-weight: bold;
}

/* 进度条容器 - 完全独立区域 */
.progress-container {
  margin-top: 0.5rem;
}

.progress-bar {
  height: 8px;
  background-color: #eee;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  margin: 0.25rem 0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
}

/* 改进25: 添加终点站样式 */
.terminal-station {
  background-color: #4CAF50 !important;
}

.station-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.station-labels-top {
  margin-bottom: 0.25rem;
}

.station-progress {
  color: #0052cc;
  font-weight: 500;
}

/* 地图区域 - 完全独立区域 */
.map-section {
  flex: 1;
  position: relative;
  border-top: 2px solid #e0e0e0; /* 添加边框分隔 */
  background-color: #fff;
  overflow: hidden;
}

.map-wrapper {
  height: 100%;
  position: relative;
  overflow: hidden;
  /* 改进22: 添加相关样式，提高拖动体验 */
  user-select: none;
  touch-action: none;
}

.map-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.zoom-button {
  width: 36px;
  height: 36px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 改进22: 添加重置按钮样式 */
.reset-button {
  font-size: 0.9rem;
  font-weight: bold;
  background-color: #f0f0f0;
}

.map-image {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
  transform-origin: center;
  /* 改进22: 设置默认的grab样式，提示用户地图可拖动 */
  will-change: transform;
}

.subway-map {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  /* 改进23: 添加图像渲染属性，确保放大时保持清晰度 */
  image-rendering: -webkit-optimize-contrast; /* Chrome, Safari */
  image-rendering: crisp-edges; /* Firefox */
  -ms-interpolation-mode: nearest-neighbor; /* IE/Edge */
  backface-visibility: hidden; /* 减少模糊 */
}

/* 改进33: 修改列车位置标记样式 */
.train-position-marker {
  position: absolute;
  font-size: 2rem;
  z-index: 5; /* 增加z-index确保在地图上方 */
  transform: translate(-50%, -50%); /* 居中显示 */
  filter: drop-shadow(0 0 5px white); /* 添加阴影效果增强可见度 */
  text-shadow: 0 0 5px white; /* 添加文字阴影，增强可见度 */
  pointer-events: none; /* 防止影响地图拖动 */
  animation: pulseMarker 1s infinite alternate; /* 添加脉动动画效果 */
}

@keyframes pulseMarker {
  from {
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

/* 详情面板 */
.details-panel {
  padding: 1rem;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.details-title {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 500;
}

.details-content {
  display: flex;
  gap: 1rem;
}

.details-section {
  flex: 1;
}

.section-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
}

.data-row {
  margin-bottom: 0.5rem;
}

.data-label {
  font-size: 0.8rem;
  color: #666;
}

.data-value {
  font-size: 1rem;
  font-weight: 500;
}

/* 改进21: 添加状态高亮样式 */
.status-highlight {
  color: #0052cc;
  font-weight: bold;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
}

.records-table th,
.records-table td {
  padding: 0.5rem;
  text-align: left;
}

.records-table th {
  background-color: #f9f9f9;
}

.no-data {
  text-align: center;
  color: #666;
}

@media (max-width: 768px) {
  .header-with-actions {
    flex-wrap: wrap;
  }
  
  .title-container {
    order: 1;
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .back-button {
    order: 2;
  }
  
  .actions-container {
    order: 3;
  }
  
  .details-content {
    flex-direction: column;
  }
  
  .records-table {
    font-size: 0.8rem;
  }
  
  .details-panel {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .station-button {
    font-size: 0.8rem;
    padding: 0.5rem;
  }
  
  .station-value {
    font-size: 0.85rem;
  }
  
  .station-label {
    font-size: 0.7rem;
  }
  
  .data-value {
    font-size: 0.9rem;
  }
  
  .details-title {
    font-size: 1.1rem;
  }
  
  .section-title {
    font-size: 0.9rem;
  }
  
  .records-table th,
  .records-table td {
    padding: 0.3rem;
  }
  
  .status-panel {
    padding: 0.5rem;
  }
}

.home-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
}

/* 改进26: 添加时间高亮样式 */
.time-highlight {
  color: #FF5722;
  font-weight: bold;
}

/* 改进27: 添加全程时间估算样式 */
.estimate-button {
  background-color: #9C27B0;
}

.estimate-panel {
  padding: 1rem;
  background-color: #f5f0ff;
  border-bottom: 1px solid #eee;
  max-height: 50vh;
  overflow-y: auto;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.estimate-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
  font-weight: 500;
  color: #6a1b9a;
}

.estimate-note {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 1rem;
  font-style: italic;
}

.estimate-content {
  overflow-x: auto;
}

.estimate-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #e0e0e0;
}

.estimate-table th,
.estimate-table td {
  padding: 0.6rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.estimate-table th {
  background-color: #9C27B0;
  color: white;
  font-weight: normal;
}

.station-name-cell {
  font-weight: 500;
  position: relative;
}

.current-station-row {
  background-color: #f3e5f5;
}

.next-station-row {
  background-color: #e8f5e9;
}

.current-indicator {
  color: #9C27B0;
  margin-right: 0.3rem;
  font-weight: bold;
}

.next-indicator {
  color: #4CAF50;
  margin-right: 0.3rem;
  font-weight: bold;
}

@media (max-width: 768px) {
  .estimate-panel {
    padding: 0.5rem;
  }
  
  .estimate-table th,
  .estimate-table td {
    padding: 0.4rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .estimate-table th,
  .estimate-table td {
    padding: 0.3rem;
    font-size: 0.8rem;
  }
  
  .estimate-title {
    font-size: 1.1rem;
  }
}
</style> 