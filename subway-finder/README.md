# 北京地铁查找器 | Beijing Subway Finder

一个基于Vue 3的单页应用，用于展示北京地铁线路列车实时位置和预计到站时间。

## 功能概览

- 实时位置追踪：在地铁线路图上展示列车实时位置
- 数据采集系统：记录列车到站和发车时间
- 精确时间预测：结合官方时刻表和历史数据计算预计到站时间
- 双向路线支持：支持所有线路的上下行方向
- 交互式地图：支持缩放和拖动的线路图

## 技术栈

- 前端框架：Vue 3 + Composition API
- 状态管理：Pinia
- 路由管理：Vue Router
- 构建工具：Vite

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## GitHub Pages 部署

此项目已配置为可以自动部署到GitHub Pages。有两种部署方式：

### 方法1：使用gh-pages包手动部署

1. 确保已经安装了gh-pages依赖：
   ```bash
   npm install --save-dev gh-pages
   ```

2. 运行部署命令：
   ```bash
   npm run deploy
   ```

### 方法2：使用GitHub Actions自动部署

项目已配置GitHub Actions工作流：

1. 将代码推送到GitHub仓库
2. 在GitHub仓库设置中启用GitHub Pages，选择Source为"GitHub Actions"
3. 每次推送到main或master分支后，GitHub Actions会自动构建并部署项目

## 配置说明

要调整GitHub Pages的基础路径，请修改以下文件：

1. `vite.config.js`中的`base`字段
2. `package.json`中的`homepage`字段
3. 确保`.github/workflows/deploy.yml`文件存在并配置正确

## 注意事项

- 确保在`package.json`中将`homepage`字段更新为你的实际GitHub Pages URL
- 部署后首次访问可能需要等待几分钟才能生效 