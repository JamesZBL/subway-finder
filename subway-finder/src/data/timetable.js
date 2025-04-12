/**
 * 地铁时刻表数据
 * 来源: http://www.mtr.bj.cn/service/line/timetable/line-4
 */

/**
 * 时刻表数据结构说明：
 * - lineId: 线路ID
 * - directions: 包含上行和下行两个方向的数据
 *   - directionId: 方向ID
 *   - stations: 站点数据
 *     - name: 站点名称
 *     - firstTrain: 首班车时间（格式: HH:mm）
 *     - lastTrain: 末班车时间（格式: HH:mm）
 *     - stopTime: 标准停站时间（毫秒），如果没有设置则默认为30秒
 */

export const timetableData = {
  '4': {
    directions: [
      {
        id: 'tiangongyuan_to_anheqiaobei', // 上行 - 天宫院 到 安河桥北
        name: '开往安河桥北方向',
        stations: [
          { name: '天宫院', firstTrain: '05:05', lastTrain: '22:45', stopTime: 0 }, // 始发站无停车时间
          { name: '生物医药基地', firstTrain: '05:07', lastTrain: '22:47', stopTime: 30000 },
          { name: '义和庄', firstTrain: '05:10', lastTrain: '22:50', stopTime: 30000 },
          { name: '黄村火车站', firstTrain: '05:13', lastTrain: '22:53', stopTime: 35000 },
          { name: '黄村西大街', firstTrain: '05:15', lastTrain: '22:55', stopTime: 30000 },
          { name: '清源路', firstTrain: '05:17', lastTrain: '22:57', stopTime: 30000 },
          { name: '枣园', firstTrain: '05:19', lastTrain: '22:59', stopTime: 30000 },
          { name: '高米店南', firstTrain: '05:21', lastTrain: '23:01', stopTime: 30000 },
          { name: '高米店北', firstTrain: '05:23', lastTrain: '23:03', stopTime: 30000 },
          { name: '西红门', firstTrain: '05:25', lastTrain: '23:05', stopTime: 30000 },
          { name: '新宫', firstTrain: '05:28', lastTrain: '23:08', stopTime: 45000 },
          { name: '公益西桥', firstTrain: '05:30', lastTrain: '23:10', stopTime: 30000 },
          { name: '角门西', firstTrain: '05:32', lastTrain: '23:12', stopTime: 30000 },
          { name: '马家堡', firstTrain: '05:34', lastTrain: '23:14', stopTime: 30000 },
          { name: '北京南站', firstTrain: '05:37', lastTrain: '23:17', stopTime: 45000 },
          { name: '陶然亭', firstTrain: '05:40', lastTrain: '23:20', stopTime: 30000 },
          { name: '菜市口', firstTrain: '05:42', lastTrain: '23:22', stopTime: 30000 },
          { name: '宣武门', firstTrain: '05:44', lastTrain: '23:24', stopTime: 35000 },
          { name: '西单', firstTrain: '05:46', lastTrain: '23:26', stopTime: 40000 },
          { name: '灵境胡同', firstTrain: '05:48', lastTrain: '23:28', stopTime: 30000 },
          { name: '西四', firstTrain: '05:50', lastTrain: '23:30', stopTime: 30000 },
          { name: '平安里', firstTrain: '05:52', lastTrain: '23:32', stopTime: 30000 },
          { name: '新街口', firstTrain: '05:54', lastTrain: '23:34', stopTime: 30000 },
          { name: '西直门', firstTrain: '05:56', lastTrain: '23:36', stopTime: 45000 },
          { name: '动物园', firstTrain: '05:59', lastTrain: '23:39', stopTime: 35000 },
          { name: '国家图书馆', firstTrain: '06:02', lastTrain: '23:42', stopTime: 40000 },
          { name: '魏公村', firstTrain: '06:04', lastTrain: '23:44', stopTime: 30000 },
          { name: '人民大学', firstTrain: '06:06', lastTrain: '23:46', stopTime: 30000 },
          { name: '海淀黄庄', firstTrain: '06:08', lastTrain: '23:48', stopTime: 35000 },
          { name: '中关村', firstTrain: '06:10', lastTrain: '23:50', stopTime: 30000 },
          { name: '北京大学东门', firstTrain: '06:12', lastTrain: '23:52', stopTime: 30000 },
          { name: '圆明园', firstTrain: '06:14', lastTrain: '23:54', stopTime: 30000 },
          { name: '西苑', firstTrain: '06:16', lastTrain: '23:56', stopTime: 30000 },
          { name: '北宫门', firstTrain: '06:18', lastTrain: '23:58', stopTime: 30000 },
          { name: '安河桥北', firstTrain: '06:21', lastTrain: '00:01', stopTime: 0 }, // 终点站无停车时间
        ]
      },
      {
        id: 'anheqiaobei_to_tiangongyuan', // 下行 - 安河桥北 到 天宫院
        name: '开往天宫院方向',
        stations: [
          { name: '安河桥北', firstTrain: '05:25', lastTrain: '23:05', stopTime: 0 }, // 始发站无停车时间
          { name: '北宫门', firstTrain: '05:28', lastTrain: '23:08', stopTime: 30000 },
          { name: '西苑', firstTrain: '05:30', lastTrain: '23:10', stopTime: 30000 },
          { name: '圆明园', firstTrain: '05:32', lastTrain: '23:12', stopTime: 30000 },
          { name: '北京大学东门', firstTrain: '05:34', lastTrain: '23:14', stopTime: 30000 },
          { name: '中关村', firstTrain: '05:36', lastTrain: '23:16', stopTime: 30000 },
          { name: '海淀黄庄', firstTrain: '05:38', lastTrain: '23:18', stopTime: 35000 },
          { name: '人民大学', firstTrain: '05:40', lastTrain: '23:20', stopTime: 30000 },
          { name: '魏公村', firstTrain: '05:42', lastTrain: '23:22', stopTime: 30000 },
          { name: '国家图书馆', firstTrain: '05:45', lastTrain: '23:25', stopTime: 40000 },
          { name: '动物园', firstTrain: '05:48', lastTrain: '23:28', stopTime: 35000 },
          { name: '西直门', firstTrain: '05:51', lastTrain: '23:31', stopTime: 45000 },
          { name: '新街口', firstTrain: '05:53', lastTrain: '23:33', stopTime: 30000 },
          { name: '平安里', firstTrain: '05:55', lastTrain: '23:35', stopTime: 30000 },
          { name: '西四', firstTrain: '05:57', lastTrain: '23:37', stopTime: 30000 },
          { name: '灵境胡同', firstTrain: '05:59', lastTrain: '23:39', stopTime: 30000 },
          { name: '西单', firstTrain: '06:01', lastTrain: '23:41', stopTime: 40000 },
          { name: '宣武门', firstTrain: '06:03', lastTrain: '23:43', stopTime: 35000 },
          { name: '菜市口', firstTrain: '06:05', lastTrain: '23:45', stopTime: 30000 },
          { name: '陶然亭', firstTrain: '06:07', lastTrain: '23:47', stopTime: 30000 },
          { name: '北京南站', firstTrain: '06:10', lastTrain: '23:50', stopTime: 45000 },
          { name: '马家堡', firstTrain: '06:13', lastTrain: '23:53', stopTime: 30000 },
          { name: '角门西', firstTrain: '06:15', lastTrain: '23:55', stopTime: 30000 },
          { name: '公益西桥', firstTrain: '06:17', lastTrain: '23:57', stopTime: 30000 },
          { name: '新宫', firstTrain: '06:19', lastTrain: '23:59', stopTime: 45000 },
          { name: '西红门', firstTrain: '06:21', lastTrain: '00:01', stopTime: 30000 },
          { name: '高米店北', firstTrain: '06:23', lastTrain: '00:03', stopTime: 30000 },
          { name: '高米店南', firstTrain: '06:25', lastTrain: '00:05', stopTime: 30000 },
          { name: '枣园', firstTrain: '06:27', lastTrain: '00:07', stopTime: 30000 },
          { name: '清源路', firstTrain: '06:29', lastTrain: '00:09', stopTime: 30000 },
          { name: '黄村西大街', firstTrain: '06:31', lastTrain: '00:11', stopTime: 30000 },
          { name: '黄村火车站', firstTrain: '06:33', lastTrain: '00:13', stopTime: 35000 },
          { name: '义和庄', firstTrain: '06:36', lastTrain: '00:16', stopTime: 30000 },
          { name: '生物医药基地', firstTrain: '06:39', lastTrain: '00:19', stopTime: 30000 },
          { name: '天宫院', firstTrain: '06:41', lastTrain: '00:21', stopTime: 0 }, // 终点站无停车时间
        ]
      }
    ]
  }
};

/**
 * 计算两个相邻站点之间的标准运行时间（分钟）
 * @param {string} lineId 线路ID
 * @param {string} fromStation 起始站点名称
 * @param {string} toStation 目标站点名称
 * @param {string} directionId 方向ID
 * @returns {number} 返回两站之间的标准运行时间（毫秒），如果没有找到则返回null
 */
export const getStandardRunningTime = (lineId, fromStation, toStation, directionId) => {
  // 如果线路不存在
  if (!timetableData[lineId]) return null;

  // 获取方向数据
  const directions = timetableData[lineId].directions;
  const direction = directions.find(dir => dir.id === directionId);
  if (!direction) return null;

  // 查找两个站点在方向中的索引
  const stations = direction.stations;
  const fromIndex = stations.findIndex(station => station.name === fromStation);
  const toIndex = stations.findIndex(station => station.name === toStation);

  // 如果站点不存在或不是相邻站点
  if (fromIndex === -1 || toIndex === -1) return null;
  if (Math.abs(fromIndex - toIndex) !== 1) return null;

  // 判断先后顺序，确保fromIndex < toIndex
  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);

  // 获取两站的首班车时间差来计算标准运行时间
  const startStation = stations[startIndex];
  const endStation = stations[endIndex];

  // 解析时间字符串为分钟数
  const parseTimeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startFirstTrainMinutes = parseTimeToMinutes(startStation.firstTrain);
  const endFirstTrainMinutes = parseTimeToMinutes(endStation.firstTrain);

  // 计算时间差（分钟）- 需要减去停车时间
  const grossDiffMinutes = endFirstTrainMinutes - startFirstTrainMinutes;
  
  // 从总时间中减去起始站的停站时间（如果有）来获得纯行驶时间
  const stopTimeMinutes = startStation.stopTime ? startStation.stopTime / 60000 : 0;
  const netDiffMinutes = grossDiffMinutes - stopTimeMinutes;
  
  // 转换为毫秒
  return netDiffMinutes > 0 ? netDiffMinutes * 60 * 1000 : null;
};

/**
 * 获取站点的标准停车时间
 * @param {string} lineId 线路ID
 * @param {string} stationName 站点名称
 * @param {string} directionId 方向ID
 * @returns {number} 返回站点的标准停车时间（毫秒），如果没有找到则返回默认30秒
 */
export const getStandardStopTime = (lineId, stationName, directionId) => {
  // 如果线路不存在
  if (!timetableData[lineId]) return 30000; // 默认30秒

  // 获取方向数据
  const directions = timetableData[lineId].directions;
  const direction = directions.find(dir => dir.id === directionId);
  if (!direction) return 30000; // 默认30秒

  // 查找站点
  const station = direction.stations.find(s => s.name === stationName);
  if (!station) return 30000; // 默认30秒

  // 返回站点的停车时间，如果没有设置则返回默认30秒
  return station.stopTime !== undefined ? station.stopTime : 30000;
};

/**
 * 计算两个站点之间的总运行时间
 * 如果站点不是相邻的，会累加中间站点的运行时间
 * 
 * @param {string} lineId 线路ID
 * @param {string} fromStation 起始站点名称
 * @param {string} toStation 目标站点名称
 * @param {string} directionId 方向ID
 * @returns {number} 返回两站之间的总运行时间（毫秒），如果没有找到则返回null
 */
export const getTotalRunningTime = (lineId, fromStation, toStation, directionId) => {
  // 如果线路不存在
  if (!timetableData[lineId]) return null;

  // 获取方向数据
  const directions = timetableData[lineId].directions;
  const direction = directions.find(dir => dir.id === directionId);
  if (!direction) return null;

  // 查找两个站点在方向中的索引
  const stations = direction.stations;
  const fromIndex = stations.findIndex(station => station.name === fromStation);
  const toIndex = stations.findIndex(station => station.name === toStation);

  // 如果站点不存在
  if (fromIndex === -1 || toIndex === -1) return null;
  
  // 如果是相邻站点，直接返回标准运行时间
  if (Math.abs(fromIndex - toIndex) === 1) {
    return getStandardRunningTime(lineId, fromStation, toStation, directionId);
  }

  // 计算总运行时间
  let totalTime = 0;
  
  // 确定起始和终止索引
  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);
  
  // 遍历所有相邻的站点对，累加运行时间和停车时间
  for (let i = startIndex; i < endIndex; i++) {
    const currentStation = stations[i].name;
    const nextStation = stations[i + 1].name;
    
    // 添加站间运行时间
    const runningTime = getStandardRunningTime(lineId, currentStation, nextStation, directionId);
    if (runningTime) {
      totalTime += runningTime;
    } else {
      // 如果有任何一段没有数据，返回null
      return null;
    }
    
    // 添加中间站点的停车时间（除了终点站）
    if (i < endIndex - 1) {
      const stopTime = getStandardStopTime(lineId, nextStation, directionId);
      totalTime += stopTime;
    }
  }
  
  return totalTime;
};

/**
 * 通过首末班车时间推算全天班次
 * 
 * @param {string} lineId 线路ID
 * @param {string} directionId 方向ID
 * @returns {Array} 返回班次列表，每个班次包含各站点的到达时间
 */
export const estimateTrainSchedules = (lineId, directionId) => {
  // 如果线路不存在
  if (!timetableData[lineId]) return [];

  // 获取方向数据
  const directions = timetableData[lineId].directions;
  const direction = directions.find(dir => dir.id === directionId);
  if (!direction) return [];

  const stations = direction.stations;
  if (stations.length === 0) return [];
  
  // 获取首发站和末班站
  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1];
  
  // 解析时间字符串为Date对象
  const parseTimeToDate = (timeStr, referenceDate = new Date()) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes, 0, 0);
    // 如果时间是"00:xx"格式，说明是第二天的时间
    if (hours < 3) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  };
  
  // 计算首末班车的运行时间差
  const firstTrainTime = parseTimeToDate(firstStation.firstTrain);
  const lastTrainTime = parseTimeToDate(firstStation.lastTrain);
  
  // 估算每天的班次数量（假设平均每10分钟一班车）
  const operationMinutes = (lastTrainTime - firstTrainTime) / 60000; // 转换为分钟
  const estimatedTrips = Math.ceil(operationMinutes / 10);
  
  // 生成班次列表
  const schedules = [];
  
  for (let i = 0; i < estimatedTrips; i++) {
    const departureTime = new Date(firstTrainTime);
    departureTime.setMinutes(departureTime.getMinutes() + i * 10);
    
    const trip = {
      tripId: `${lineId}-${directionId}-${i + 1}`,
      stations: []
    };
    
    // 计算每个站点的到达时间
    for (let j = 0; j < stations.length; j++) {
      const currentStation = stations[j];
      
      if (j === 0) {
        // 首发站
        trip.stations.push({
          name: currentStation.name,
          arrivalTime: null,
          departureTime: departureTime.toISOString()
        });
      } else {
        // 计算从首发站到当前站的总运行时间
        const totalTime = getTotalRunningTime(lineId, firstStation.name, currentStation.name, directionId);
        
        if (totalTime) {
          const arrivalTime = new Date(departureTime.getTime() + totalTime);
          
          trip.stations.push({
            name: currentStation.name,
            arrivalTime: arrivalTime.toISOString(),
            departureTime: j === stations.length - 1 ? null : new Date(arrivalTime.getTime() + currentStation.stopTime).toISOString() // 使用站点的标准停车时间
          });
        } else {
          // 如果无法计算到达时间，使用默认值
          const defaultTime = j * 3 * 60000; // 每站默认3分钟
          const arrivalTime = new Date(departureTime.getTime() + defaultTime);
          
          trip.stations.push({
            name: currentStation.name,
            arrivalTime: arrivalTime.toISOString(),
            departureTime: j === stations.length - 1 ? null : new Date(arrivalTime.getTime() + 30000).toISOString() // 默认停站30秒
          });
        }
      }
    }
    
    schedules.push(trip);
  }
  
  return schedules;
};

export default timetableData; 