# 北京地铁列车查找器 | Beijing Subway Finder

[![Vue 3](https://img.shields.io/badge/Vue-3-42b883)](https://vuejs.org/)
[![Pinia](https://img.shields.io/badge/Pinia-Store-f7d336)](https://pinia.vuejs.org/)
[![Vue Router](https://img.shields.io/badge/Vue%20Router-4-3eaf7c)](https://router.vuejs.org/)

一个基于Vue 3的单页应用，用于展示北京地铁线路列车实时位置和预计到站时间。通过用户采集的运行数据和官方时刻表数据，准确计算并可视化显示列车运行状态。

## 🚇 功能概览

- **实时位置追踪**：在地铁线路图上展示列车实时位置
- **数据采集系统**：记录列车到站和发车时间
- **精确时间预测**：结合官方时刻表和历史数据计算预计到站时间
- **双向路线支持**：支持所有线路的上下行方向
- **交互式地图**：支持缩放和拖动的线路图
- **运行状态显示**：显示列车当前状态（停车中/行驶中）
- **本地数据存储**：数据持久化到localStorage

## 🛠️ 技术栈

- **前端框架**：Vue 3 + Composition API
- **状态管理**：Pinia
- **路由管理**：Vue Router
- **构建工具**：Vite
- **数据存储**：LocalStorage

## 📊 数据源

应用使用两种数据源计算列车位置和到站时间：

1. **时刻表数据**：从北京地铁官方网站获取的时刻表，包含各站首末班车时间和标准停站时间
2. **用户采集数据**：用户手动记录的列车到站和发车时间

系统会优先使用时刻表数据，当时刻表数据不足时会使用用户采集的历史数据，确保预测的准确性。

## 📂 项目结构

```
src/
├── assets/         # 静态资源（地铁线路图等）
├── components/     # 可复用组件
├── data/           # 数据文件
│   ├── stations.js # 地铁站点数据
│   └── timetable.js # 时刻表数据
├── router/         # 路由配置
├── stores/         # Pinia存储
│   └── subwayStore.js # 地铁数据状态管理
├── utils/          # 工具函数
├── views/          # 页面视图
│   ├── HomePage.vue      # 首页
│   ├── LinesPage.vue     # 线路选择页
│   ├── DirectionsPage.vue # 方向选择页
│   ├── StationsPage.vue   # 站点选择页
│   └── MapPage.vue       # 地图展示页
└── App.vue         # 根组件
```

## 📱 页面流程

1. **首页**：选择数据采集或位置展示模式
2. **线路选择**：选择地铁线路
3. **方向选择**：选择上行或下行方向
4. **站点选择**：选择要记录或展示的站点
5. **地图展示**：显示列车实时位置和到站预测

## ⚙️ 核心算法

### 列车位置计算

列车位置基于以下三种方式之一计算：

1. **标准运行时间**：使用`getStandardRunningTime`从时刻表获取标准运行时间
2. **历史平均时间**：使用`calculateAverageTimeBetweenStations`计算历史平均运行时间
3. **默认估算**：无数据时使用90秒的默认值

### 停站时间计算

停站时间基于以下方式计算：

1. **标准停站时间**：使用`getStandardStopTime`从时刻表获取标准停站时间
2. **历史平均值**：使用`calculateAverageStopTimeAtStation`计算历史平均停站时间
3. **默认估算**：无数据时使用30秒的默认值

## 🚀 安装与运行

```bash
# 克隆仓库
git clone https://github.com/yourusername/subway-finder.git
cd subway-finder

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包构建
npm run build

# 预览生产构建
npm run preview
```

## 💾 数据存储

所有列车运行数据存储在浏览器的localStorage中，即使关闭浏览器数据也不会丢失，便于积累历史运行数据以提高预测准确性。

## 🔄 数据流程

1. **数据采集**：用户手动记录列车到站和发车时间
2. **数据存储**：数据保存到localStorage中
3. **数据处理**：计算平均运行时间和停站时间
4. **位置计算**：结合时刻表数据和历史数据计算列车实时位置
5. **可视化展示**：在地图和进度条上显示列车位置

## 📝 未来改进

- 支持更多线路的时刻表数据
- 添加班次信息显示
- 添加换乘建议功能
- 连接后端API实现数据共享
- 添加线路拥堵预警功能
