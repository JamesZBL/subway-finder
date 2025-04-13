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

// 地图放大缩小
const adjustZoom = (delta) => {
  zoom.value = Math.max(0.5, Math.min(5, zoom.value + delta));
  // 强制重绘防止出现渲染问题
  setTimeout(() => {
    const mapElement = document.querySelector('.map-image');
    if (mapElement) {
      mapElement.style.display = 'none';
      setTimeout(() => {
        mapElement.style.display = '';
      }, 10);
    }
  }, 100);
}

// 重置地图位置
const resetMapPosition = () => {
  zoom.value = 1;
  mapOffsetX.value = 0;
  mapOffsetY.value = 0;
}

// 开始拖动地图
const startDragMap = (e) => {
  isDragging.value = true;
  startDragX.value = e.touches ? e.touches[0].clientX : e.clientX;
  startDragY.value = e.touches ? e.touches[0].clientY : e.clientY;
}

// 拖动地图
const dragMap = (e) => {
  if (!isDragging.value) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const moveX = clientX - startDragX.value;
  const moveY = clientY - startDragY.value;
  
  mapOffsetX.value += moveX;
  mapOffsetY.value += moveY;
  
  startDragX.value = clientX;
  startDragY.value = clientY;
  
  // 阻止默认行为防止页面滚动
  e.preventDefault();
}

// 停止拖动地图
const stopDragMap = () => {
  isDragging.value = false;
}

// 切换显示详细信息
const toggleDetails = () => {
  // 修改为页面导航
  router.push({
    path: '/details',
    query: { 
      lineId: lineId.value,
      direction: direction.value,
      stationName: currentStation.value ? currentStation.value.name : '',
      currentStatus: eventTypeCode.value
    }
  })
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

// 添加mapImageSrc计算属性
const mapImageSrc = computed(() => {
  return '/subway-finder/images/Beijing Rail Transit Lines.png'
})

// 列车位置计算
const currentTrainPosition = computed(() => {
  // 模拟站点坐标数据 - 在实际应用中应该从数据源获取
  const stationPositions = {
    // 这里是示例坐标，实际应用中应该替换为真实的地图坐标
    '公益西桥': { x: 500, y: 300 },
    '新宫': { x: 550, y: 300 },
    '西红门': { x: 600, y: 300 },
    '高米店南': { x: 650, y: 300 },
    '高米店北': { x: 700, y: 300 },
    '枣园': { x: 750, y: 300 },
    '清源路': { x: 800, y: 300 },
    '黄村西大街': { x: 850, y: 300 },
    '黄村火车站': { x: 900, y: 300 },
    '义和庄': { x: 950, y: 300 },
    '生物医药基地': { x: 1000, y: 300 },
    '天宫院': { x: 1050, y: 300 }
  };
  
  if (!currentStation.value) return null;
  
  const currentStationName = currentStation.value.name;
  const currentPos = stationPositions[currentStationName];
  
  if (!currentPos) return null;
  
  // 如果是停车状态，直接返回当前站点位置
  if (eventTypeCode.value === 1 || isTerminalStation.value) {
    return currentPos;
  }
  
  // 如果是行驶状态，计算列车在两站之间的位置
  if (eventTypeCode.value === 2 && nextStation.value) {
    const nextStationName = nextStation.value.name;
    const nextPos = stationPositions[nextStationName];
    
    if (!nextPos) return currentPos;
    
    // 根据进度计算列车位置
    const progress = currentPosition.value / 100;
    const x = currentPos.x + (nextPos.x - currentPos.x) * progress;
    const y = currentPos.y + (nextPos.y - currentPos.y) * progress;
    
    return { x, y };
  }
  
  return currentPos;
});

// 切换显示全程估算时间
const toggleFullRouteEstimate = () => {
  // 修改为页面导航
  router.push({
    path: '/estimate',
    query: { 
      lineId: lineId.value,
      direction: direction.value,
      stationName: currentStation.value ? currentStation.value.name : ''
    }
  })
}

// 计算全程预计到达时间
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
      departureTime: '未知',
      isCurrentStation: i === currentStationIndex.value,
      isNextStation: i === nextStationIndex.value
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
        
        const elapsedTime = now - startTime.value
        const remainingTime = Math.max(0, stopTime - elapsedTime)
        
        if (remainingTime <= 0) {
          stationInfo.departureTime = '即将发车'
        } else {
          // 使用格式化函数确保时间格式正确
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
      
      const elapsedTime = now - startTime.value
      const remainingTime = Math.max(0, runningTime - elapsedTime)
      
      if (remainingTime <= 0) {
        stationInfo.arrivalTime = '即将到站'
      } else {
        // 使用格式化函数确保时间格式正确
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
      // 默认运行时间3分钟
      const defaultRunningTime = 3 * 60 * 1000
      // 计算从上一站到此站的运行时间
      let runningTime = defaultRunningTime
      
      // 尝试获取历史数据
      if (i > 0) {
        const prevStation = allStations[i-1]
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
      stationInfo.arrivalTime = formatTimeWithSeconds(arrivalTime)
      
      // 如果不是终点站，计算发车时间
      if (i < allStations.length - 1) {
        // 默认停站30秒
        const departureTime = new Date(arrivalTime.getTime() + 30000)
        stationInfo.departureTime = formatTimeWithSeconds(departureTime)
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
  
  return result
}

// 更新估算时间，实时反映最新数据
const updateFullRouteEstimate = computed(() => {
  // 使用计数器触发更新
  const refreshTrigger = timeRefresher.value
  
  if (showFullRouteEstimate.value) {
    fullRouteEstimate.value = calculateFullRouteEstimate()
  }
  
  return fullRouteEstimate.value
})
</script>

<template>
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <!-- iOS风格导航栏 -->
    <div class="ios-navbar">
      <div class="ios-back-button" @click="goBack">返回</div>
      <h1 v-if="subwayStore.currentLine">{{ subwayStore.currentLine.name }}</h1>
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
    
    <!-- 状态信息卡片 -->
    <div class="ios-card station-status-card">
      <div class="direction-info" v-if="directionInfo">
        {{ directionInfo.name }}
      </div>
      
      <!-- 改进21: 当前状态显示 -->
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
      
      <!-- 站点和进度信息 -->
      <div class="station-info-compact">
        <div class="station-row">
          <div class="station-label">当前站点</div>
          <div class="station-value">{{ currentStation ? currentStation.name : '-' }}</div>
        </div>
        <div class="station-row">
          <div class="station-label">下一站点</div>
          <div class="station-value">{{ nextStation ? nextStation.name : '-' }}</div>
        </div>
        <div class="station-row">
          <div class="station-label">预计到达</div>
          <div class="station-value" :class="{'arriving-soon': estimatedArrivalTime && (estimatedArrivalTime.includes('即将到站') || estimatedArrivalTime.includes('即将发车'))}">
            {{ estimatedArrivalTime || '-' }}
          </div>
        </div>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-container">
        <div class="station-labels">
          <span class="from-station" v-if="currentStation">{{ currentStation.name }}</span>
          <span class="progress-percent" v-if="currentPosition > 0">{{ progressText }}</span>
          <span class="to-station" v-if="nextStation">{{ nextStation.name }}</span>
        </div>
        
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ 
              width: `${currentPosition}%`,
              backgroundColor: isTerminalStation ? '#34c759' : lineColor
            }"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- 地图区域 -->
    <div class="map-section">
      <div class="map-wrapper"
           @touchstart="startDragMap"
           @touchmove="dragMap"
           @touchend="stopDragMap"
           @touchcancel="stopDragMap">
        <div class="map-image" 
             :style="{ 
               transform: `scale(${zoom}) translate(${mapOffsetX / zoom}px, ${mapOffsetY / zoom}px)`,
               transformOrigin: '0 0'
             }">
          <img :src="mapImageSrc" alt="地铁线路图" class="subway-map">
          
          <!-- 添加火车位置标记 -->
          <div 
            v-if="currentTrainPosition && currentTrainPosition.x && currentTrainPosition.y"
            class="train-marker"
            :style="{
              left: `${currentTrainPosition.x}px`,
              top: `${currentTrainPosition.y}px`,
              backgroundColor: lineColor
            }"
          ></div>
      </div>
      </div>
      
      <!-- 地图控制按钮组 -->
      <div class="map-controls">
        <button class="zoom-button" @click="() => adjustZoom(0.2)">+</button>
        <button class="zoom-button" @click="() => adjustZoom(-0.2)">-</button>
        <button class="zoom-button reset-button" @click="resetMapPosition">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 底部操作按钮 -->
    <div class="bottom-actions">
      <button class="action-button" @click="toggleDetails">
        查看详情
      </button>
      <button class="action-button" @click="toggleFullRouteEstimate">
        全程估算
      </button>
      <button class="action-button switch-line-button" @click="switchLine">
        切换线路
      </button>
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

.station-status-card {
  padding: 16px;
  margin: 10px 16px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.direction-info {
  font-size: 14px;
  color: #8e8e93;
  margin-bottom: 8px;
}

.current-status {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f2f2f7;
  border-radius: 10px;
}

.status-icon {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: #007aff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
}

.status-icon.status-stopping {
  background-color: #ff9500;
}

.status-icon.status-running {
  background-color: #30d158;
}

.status-icon.status-terminal {
  background-color: #af52de;
}

.status-text {
  font-size: 17px;
  font-weight: 600;
}

.station-info-compact {
  margin-bottom: 16px;
}

.station-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

.station-row:last-child {
  border-bottom: none;
}

.station-label {
  font-size: 15px;
  color: #8e8e93;
}

.station-value {
  font-size: 15px;
  font-weight: 500;
}

.arriving-soon {
  color: #ff3b30;
}

.progress-container {
  margin-top: 16px;
  z-index: 10;
  position: relative;
}

.station-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.from-station, .to-station {
  color: #8e8e93;
}

.progress-percent {
  color: #8e8e93;
  font-weight: 500;
}

.progress-bar {
  height: 8px;
  background-color: #e5e5ea;
  border-radius: 4px;
  overflow: hidden;
  z-index: 10;
}

.progress-fill {
  height: 100%;
  background-color: #007aff;
  border-radius: 4px;
  transition: width 0.2s ease;
}

.map-section {
  flex: 1;
  position: relative;
  overflow: hidden;
  margin: 8px 16px 8px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background-color: white;
  min-height: 300px;
  z-index: 1;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  touch-action: none;
}

.map-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  display: flex;
  align-items: center;
  justify-content: center;
}

.subway-map {
  width: 100%;
  max-width: none;
  max-height: none;
  display: block;
  object-fit: contain;
  image-rendering: -webkit-optimize-contrast; /* Chrome, Safari */
  image-rendering: crisp-edges; /* Firefox */
}

.train-marker {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #007aff;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  z-index: 10;
  animation: pulse 1.5s infinite alternate;
}

@keyframes pulse {
  from {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
  }
  to {
    transform: translate(-50%, -50%) scale(1.2);
    box-shadow: 0 0 0 5px rgba(0, 122, 255, 0.15);
  }
}

.map-controls {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 10;
}

.zoom-button {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  color: #007aff;
  padding: 0;
}

.reset-button {
  font-size: 16px;
}

.bottom-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
  margin-top: 8px;
  margin-bottom: env(safe-area-inset-bottom);
}

.action-button {
  flex: 1;
  height: 44px;
  padding: 0;
  font-size: 15px;
  background-color: #007aff;
  color: white;
}

.switch-line-button {
  background-color: #34c759;
}

.home-icon {
  width: 22px;
  height: 22px;
  color: #007aff;
}
</style> 