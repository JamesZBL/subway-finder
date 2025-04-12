# 北京地铁列车查找器

一个基于Vue 3的单页应用，用于展示北京地铁线路列车实时位置和预计到站时间。

## 功能特点

- 采集列车运行数据（到站/发车时间）
- 展示列车实时位置
- 计算预计到站时间
- 支持线路切换
- 数据本地存储

## 技术栈

- Vue 3
- Vue Router
- Pinia
- Vite

## 安装与运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 打包构建
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
src/
├── assets/         # 静态资源
├── components/     # 组件
├── data/           # 数据文件
├── router/         # 路由配置
├── stores/         # Pinia存储
└── views/          # 页面视图
```

## 数据存储

应用数据存储在浏览器的localStorage中，确保数据不会被轻易清除。

## 改进35
- 解析http://www.mtr.bj.cn/service/line/timetable/line-4，获取地铁运行时刻表
- 创建了`timetable.js`文件，存储时刻表数据，包含各站首末班车时间
- 实现了`getStandardRunningTime`函数，从时刻表数据中计算相邻站点间的标准运行时间
- 实现了`getTotalRunningTime`函数，计算非相邻站点间的总运行时间
- 修改了`calculateTrainPosition`和`calculateRealProgress`方法，优先使用时刻表数据计算运行时间
- 更新了预计到达时间的计算逻辑，优先使用时刻表数据

## 改进36

- 在时刻表数据中添加了车站停车时间信息（stopTime）
- 添加了`getStandardStopTime`函数，用于获取指定车站的标准停车时间
- 修改了`getStandardRunningTime`函数，在计算两站间运行时间时会扣除停车时间
- 更新了`getTotalRunningTime`函数，计算总运行时间时会考虑中间站点的停车时间
- 修改了`MapPage.vue`中的`calculateRealProgress`方法，优先使用时刻表中的标准停车时间计算停车进度

这一改进使得列车的停车时间不再是固定的默认值，而是根据时刻表数据精确计算，提高了列车运行状态预测的准确性。
