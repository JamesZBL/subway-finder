import { defineStore } from 'pinia'
import { getStandardRunningTime } from '../data/timetable'

// 改进28: 添加格式化时间的通用函数，确保时间格式为 HH:mm:ss
const formatTimeWithSeconds = (date) => {
  if (!date || !(date instanceof Date)) return '未知'
  
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return `${hours}:${minutes}:${seconds}`
}

export const useSubwayStore = defineStore('subway', {
  state: () => ({
    lines: [
      { id: '1', name: '1号线' },
      { id: '2', name: '2号线' },
      { id: '4', name: '4号线' },
      { id: '5', name: '5号线' },
      { id: '6', name: '6号线' },
      { id: '7', name: '7号线' },
      { id: '8', name: '8号线' },
      { id: '9', name: '9号线' },
      { id: '10', name: '10号线' },
      { id: '13', name: '13号线' },
      { id: '14', name: '14号线' },
      { id: '15', name: '15号线' },
      { id: '16', name: '16号线' },
      { id: 'bt', name: '八通线' },
      { id: 'cp', name: '昌平线' },
      { id: 'fs', name: '房山线' },
      { id: 'yz', name: '燕房线' },
      { id: 'dx', name: '大兴线' },
      { id: 'sh', name: 'S1线' },
    ],
    currentLine: null,
    currentDirection: null,
    currentStation: null,
    trainData: null,
    currentMode: 'display', // 'display' or 'collection'
    runningData: {}  // 存储每条线路的运行数据
  }),
  
  getters: {
    getCurrentLine(state) {
      return state.currentLine
    },
    getCurrentDirection(state) {
      return state.currentDirection
    },
    getLineById: (state) => (id) => {
      return state.lines.find(line => line.id === id)
    },
    getRunningDataForLine: (state) => (lineId, directionId) => {
      if (!directionId) return state.runningData[lineId] || []
      return state.runningData[`${lineId}-${directionId}`] || []
    }
  },
  
  actions: {
    setCurrentLine(line) {
      this.currentLine = line
    },
    setCurrentDirection(direction) {
      this.currentDirection = direction
    },
    setCurrentStation(station) {
      this.currentStation = station
    },
    setMode(mode) {
      this.currentMode = mode
    },
    
    // 记录列车到站或起步数据
    recordTrainEvent(lineId, stationName, eventType, directionId, timestamp = new Date()) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      
      if (!this.runningData[dataKey]) {
        this.runningData[dataKey] = []
      }
      
      this.runningData[dataKey].push({
        lineId,
        directionId,
        stationName,
        eventType, // 'arrival' 或 'departure'
        timestamp: timestamp.toISOString(),
        id: Date.now().toString()
      })
      
      // 保存到 localStorage
      this.saveRunningData()
    },
    
    // 撤销最近的一个操作
    cancelLastEvent(lineId, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      
      if (this.runningData[dataKey] && this.runningData[dataKey].length > 0) {
        this.runningData[dataKey].pop()
        this.saveRunningData()
      }
    },
    
    // 保存运行数据到 localStorage
    saveRunningData() {
      localStorage.setItem('subwayRunningData', JSON.stringify(this.runningData))
    },
    
    // 从 localStorage 加载运行数据
    loadRunningData() {
      const savedData = localStorage.getItem('subwayRunningData')
      if (savedData) {
        this.runningData = JSON.parse(savedData)
      }
    },
    
    // 计算两站之间的平均运行时间，支持跳站计算
    calculateAverageTimeBetweenStations(lineId, fromStation, toStation, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      console.log('计算平均运行时间开始:', { lineId, fromStation, toStation, directionId, dataKey })
      
      if (!this.runningData[dataKey]) {
        console.log('没有找到该线路方向的运行数据:', dataKey)
        return null
      }
      
      // 获取所有起步和到站记录
      const events = this.runningData[dataKey]
      console.log('找到运行数据记录数量:', events.length)
      
      // 按时间排序所有事件
      const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
      
      let totalTime = 0
      let count = 0
      
      // 分析事件序列，寻找从 fromStation 到 toStation 的记录
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEvent = sortedEvents[i]
        
        // 如果当前事件是起步事件且站点是 fromStation
        if (currentEvent.eventType === 'departure' && currentEvent.stationName === fromStation) {
          // 改进28: 使用格式化函数确保时间格式正确
          console.log('找到起点站起步事件:', currentEvent.stationName, formatTimeWithSeconds(new Date(currentEvent.timestamp)))
          
          // 在后续事件中寻找toStation的到站事件
          for (let j = i + 1; j < sortedEvents.length; j++) {
            const nextEvent = sortedEvents[j]
            
            // 找到下一个到站事件，且站点是toStation
            if (nextEvent.eventType === 'arrival' && nextEvent.stationName === toStation) {
              const startTime = new Date(currentEvent.timestamp).getTime()
              const endTime = new Date(nextEvent.timestamp).getTime()
              
              // 计算时间差
              if (endTime > startTime) {
                const timeDiff = endTime - startTime
                // 改进28: 使用格式化函数确保时间格式正确
                console.log('找到终点站到达事件:', nextEvent.stationName, formatTimeWithSeconds(new Date(nextEvent.timestamp)))
                console.log('区间运行时间(毫秒):', timeDiff, '区间运行时间(秒):', (timeDiff/1000).toFixed(2))
                
                totalTime += timeDiff
                count++
                
                // 找到一个匹配后就跳出内层循环
                break
              }
            }
            
            // 如果在寻找toStation之前找到了其他的 fromStation 的离站事件，则当前序列无效
            if (nextEvent.eventType === 'departure' && nextEvent.stationName === fromStation) {
              console.log('在寻找过程中发现新的起点站起步事件，放弃当前序列')
              break
            }
          }
        }
      }
      
      // 如果有有效记录，计算平均运行时间
      if (count > 0) {
        const averageTime = Math.round(totalTime / count)
        console.log(`计算完成: 总运行时间 ${totalTime}ms / ${count}条记录 = 平均${averageTime}ms (约${(averageTime/1000).toFixed(2)}秒)`)
        return averageTime
      }
      
      console.log('没有找到有效的运行记录')
      return null
    },
    
    // 预计到站时间
    estimateArrivalTime(lineId, fromStation, toStation, directionId) {
      const avgTime = this.calculateAverageTimeBetweenStations(lineId, fromStation, toStation, directionId)
      if (!avgTime) return null
      
      const lastDeparture = this.getLastDeparture(lineId, fromStation, directionId)
      if (!lastDeparture) return null
      
      const departureTime = new Date(lastDeparture.timestamp).getTime()
      const estimatedArrivalTime = new Date(departureTime + avgTime)
      
      return estimatedArrivalTime
    },
    
    // 获取最近一次从指定站点出发的时间
    getLastDeparture(lineId, stationName, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      
      if (!this.runningData[dataKey]) return null
      
      const departures = this.runningData[dataKey].filter(
        event => event.stationName === stationName && event.eventType === 'departure'
      )
      
      if (departures.length === 0) return null
      
      return departures.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    },
    
    // 获取最近一次到达指定站点的时间
    getLastArrival(lineId, stationName, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      
      if (!this.runningData[dataKey]) return null
      
      const arrivals = this.runningData[dataKey].filter(
        event => event.stationName === stationName && event.eventType === 'arrival'
      )
      
      if (arrivals.length === 0) return null
      
      return arrivals.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
    },
    
    // 计算列车当前位置，返回百分比
    calculateTrainPosition(lineId, fromStation, toStation, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      console.log('计算列车位置开始:', { lineId, fromStation, toStation, directionId, dataKey })
      
      if (!this.runningData[dataKey]) {
        console.log('没有找到该线路方向的运行数据')
        return 0
      }
      
      // 获取所有事件并按时间排序
      const events = [...this.runningData[dataKey]].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      console.log('找到运行数据记录数量:', events.length)
      
      // 查找最近一次fromStation的到站和离站记录，以及toStation的到站记录
      let fromStationArrival = null
      let fromStationDeparture = null
      let toStationArrival = null
      
      // 从最新的记录开始查找，确保获取最近的有效记录
      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i]
        
        if (event.stationName === fromStation) {
          if (event.eventType === 'departure' && !fromStationDeparture) {
            fromStationDeparture = event
            // 改进28: 使用格式化函数确保时间格式正确
            console.log('找到起点站最近离站记录:', formatTimeWithSeconds(new Date(event.timestamp)))
          } else if (event.eventType === 'arrival' && !fromStationArrival) {
            fromStationArrival = event
            // 改进28: 使用格式化函数确保时间格式正确
            console.log('找到起点站最近到站记录:', formatTimeWithSeconds(new Date(event.timestamp)))
          }
        } else if (event.stationName === toStation && event.eventType === 'arrival' && !toStationArrival) {
          toStationArrival = event
          // 改进28: 使用格式化函数确保时间格式正确
          console.log('找到终点站最近到站记录:', formatTimeWithSeconds(new Date(event.timestamp)))
        }
        
        // 如果已经找到所有需要的记录，可以提前结束循环
        if (fromStationArrival && fromStationDeparture && toStationArrival) {
          break
        }
      }
      
      // 如果没有找到出发站的离站记录，无法计算进度
      if (!fromStationDeparture) {
        console.log('没有找到起点站离站记录，无法计算进度')
        return 0
      }
      
      // 获取当前时间和离站时间
      const now = new Date().getTime()
      const departureTime = new Date(fromStationDeparture.timestamp).getTime()
      const elapsedTime = now - departureTime
      // 改进28: 使用格式化函数确保时间格式正确
      console.log('离站时间:', formatTimeWithSeconds(new Date(departureTime)))
      console.log('当前时间:', formatTimeWithSeconds(new Date(now)))
      console.log('经过时间(毫秒):', elapsedTime, '经过时间(秒):', (elapsedTime/1000).toFixed(2))
      
      // 计算站点间的运行时间
      let runningTime = 0
      
      // 改进35: 首先尝试从时刻表获取标准运行时间
      console.log('尝试从时刻表获取标准运行时间')
      const standardTime = getStandardRunningTime(lineId, fromStation, toStation, directionId)
      if (standardTime) {
        runningTime = standardTime
        console.log('从时刻表获取到的标准运行时间(毫秒):', runningTime, '运行时间(秒):', (runningTime/1000).toFixed(2))
      }
      // 如果无法从时刻表获取，则尝试从历史记录中获取
      else if (fromStationDeparture && toStationArrival) {
        // 找到最近一组完整的运行记录，即从fromStation离站到toStation到站
        // 寻找fromStationDeparture之后的toStationArrival
        const matchingArrivals = events.filter(
          event => event.stationName === toStation && 
                   event.eventType === 'arrival' &&
                   new Date(event.timestamp).getTime() > departureTime
        )
        
        if (matchingArrivals.length > 0) {
          // 按时间排序，找到最近的一次到站
          const nearestArrival = matchingArrivals.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )[0]
          
          const arrivalTime = new Date(nearestArrival.timestamp).getTime()
          runningTime = arrivalTime - departureTime
          console.log('找到匹配的历史运行记录，运行时间(毫秒):', runningTime, '运行时间(秒):', (runningTime/1000).toFixed(2))
        } else {
          // 如果没有找到匹配的到站记录，使用平均运行时间
          console.log('没有找到匹配的历史运行记录，尝试使用平均运行时间')
          runningTime = this.calculateAverageTimeBetweenStations(lineId, fromStation, toStation, directionId)
        }
      }
      
      // 如果没有标准运行时间和历史运行数据，使用计算的平均时间
      if (!runningTime) {
        console.log('尝试使用平均运行时间')
        runningTime = this.calculateAverageTimeBetweenStations(lineId, fromStation, toStation, directionId)
      }
      
      // 如果仍然没有运行时间数据，使用默认值（90秒）
      if (!runningTime) {
        runningTime = 90 * 1000
        console.log('没有任何运行时间数据，使用默认值:', runningTime, '毫秒 (90秒)')
      } else {
        console.log('使用的运行时间(毫秒):', runningTime, '运行时间(秒):', (runningTime/1000).toFixed(2))
      }
      
      // 计算进度百分比
      let progress = (elapsedTime / runningTime) * 100
      console.log('计算进度: 经过时间/运行时间 =', elapsedTime, '/', runningTime, '=', progress.toFixed(2) + '%')
      
      // 确保进度在0-100范围内
      const finalProgress = Math.max(0, Math.min(100, progress))
      console.log('最终进度(限制在0-100范围内):', finalProgress.toFixed(2) + '%')
      return finalProgress
    },
    
    // 根据历史数据推断列车速度和位置
    inferTrainData(lineId, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      
      if (!this.runningData[dataKey] || this.runningData[dataKey].length < 2) {
        return {
          averageSpeed: null,
          lastKnownPosition: null,
          lastKnownTime: null
        }
      }
      
      // 根据已有数据计算平均速度
      let totalTime = 0
      let totalEvents = 0
      
      const sortedEvents = [...this.runningData[dataKey]].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      
      for (let i = 1; i < sortedEvents.length; i++) {
        const prevEvent = sortedEvents[i - 1]
        const currEvent = sortedEvents[i]
        
        const prevTime = new Date(prevEvent.timestamp).getTime()
        const currTime = new Date(currEvent.timestamp).getTime()
        
        if (currTime > prevTime) {
          totalTime += currTime - prevTime
          totalEvents++
        }
      }
      
      const averageSpeed = totalEvents > 0 ? totalTime / totalEvents : null
      
      // 获取最新的事件作为最后已知位置
      const lastEvent = sortedEvents[sortedEvents.length - 1]
      
      return {
        averageSpeed,
        lastKnownPosition: lastEvent ? lastEvent.stationName : null,
        lastKnownTime: lastEvent ? new Date(lastEvent.timestamp) : null,
        lastKnownEventType: lastEvent ? lastEvent.eventType : null
      }
    },
    
    // 改进24: 计算站点的平均停车时间
    calculateAverageStopTimeAtStation(lineId, stationName, directionId) {
      const dataKey = directionId ? `${lineId}-${directionId}` : lineId
      console.log('计算平均停车时间开始:', { lineId, stationName, directionId, dataKey })
      
      if (!this.runningData[dataKey]) {
        console.log('没有找到该线路方向的运行数据:', dataKey)
        return null
      }
      
      // 获取所有事件记录
      const events = this.runningData[dataKey]
      console.log('找到运行数据记录数量:', events.length)
      
      // 按时间排序所有事件
      const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
      
      let totalTime = 0
      let count = 0
      
      // 分析事件序列，寻找从站点到站到站点离站的记录
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentEvent = sortedEvents[i]
        
        // 如果当前事件是到站事件且站点是目标站点
        if (currentEvent.eventType === 'arrival' && currentEvent.stationName === stationName) {
          // 改进28: 使用格式化函数确保时间格式正确
          console.log('找到站点到站事件:', currentEvent.stationName, formatTimeWithSeconds(new Date(currentEvent.timestamp)))
          
          // 在后续事件中寻找同一站点的离站事件
          for (let j = i + 1; j < sortedEvents.length; j++) {
            const nextEvent = sortedEvents[j]
            
            // 找到下一个离站事件，且站点是同一站点
            if (nextEvent.eventType === 'departure' && nextEvent.stationName === stationName) {
              const arrivalTime = new Date(currentEvent.timestamp).getTime()
              const departureTime = new Date(nextEvent.timestamp).getTime()
              
              // 计算停车时间差
              if (departureTime > arrivalTime) {
                const timeDiff = departureTime - arrivalTime
                // 改进28: 使用格式化函数确保时间格式正确
                console.log('找到站点离站事件:', nextEvent.stationName, formatTimeWithSeconds(new Date(nextEvent.timestamp)))
                console.log('站点停车时间(毫秒):', timeDiff, '站点停车时间(秒):', (timeDiff/1000).toFixed(2))
                
                totalTime += timeDiff
                count++
                
                // 找到一个匹配后就跳出内层循环
                break
              }
            }
            
            // 如果在寻找离站之前找到了其他站点的到站事件，则当前序列无效
            if (nextEvent.eventType === 'arrival' && nextEvent.stationName === stationName) {
              console.log('在寻找过程中发现新的到站事件，放弃当前序列')
              break
            }
          }
        }
      }
      
      // 如果有有效记录，计算平均停车时间
      if (count > 0) {
        const averageTime = Math.round(totalTime / count)
        console.log(`计算完成: 总停车时间 ${totalTime}ms / ${count}条记录 = 平均${averageTime}ms (约${(averageTime/1000).toFixed(2)}秒)`)
        return averageTime
      }
      
      console.log('没有找到有效的停车记录')
      return null
    }
  }
}) 