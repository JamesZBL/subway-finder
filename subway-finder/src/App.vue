<script setup>
import { onMounted } from 'vue'
import { useSubwayStore } from './stores/subwayStore'
import toast from './utils/toast'

const subwayStore = useSubwayStore()

// 进入全屏模式函数
const enterFullscreen = () => {
  const element = document.documentElement;
  
  // 尝试不同的全屏API
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
};

// 处理全屏状态变化
const handleFullscreenChange = () => {
  if (!document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && 
      !document.msFullscreenElement) {
    // 尝试在退出全屏时自动重新进入
    setTimeout(() => {
      try {
        enterFullscreen();
      } catch (e) {
        console.log('自动进入全屏失败:', e);
      }
    }, 1000);
  }
};

onMounted(() => {
  // 加载本地存储的数据
  subwayStore.loadRunningData()
  
  // 添加适配移动设备的meta标签
  const meta = document.createElement('meta')
  meta.name = 'viewport'
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  document.head.appendChild(meta)
  
  // 强制使用浅色模式
  document.documentElement.classList.add('light-mode')
  document.documentElement.setAttribute('data-theme', 'light')
  // 确保颜色方案永远是light
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (colorSchemeMeta) {
    colorSchemeMeta.content = 'light'
  }
  
  // 禁止页面缩放
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
  
  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // 首次尝试进入全屏模式
  try {
    // 用户首次交互后尝试进入全屏
    document.addEventListener('click', () => {
      enterFullscreen();
    }, { once: true });
  } catch (e) {
    console.log('全屏初始化失败:', e);
  }
  
  // 测试Toast是否工作
  setTimeout(() => {
    toast.info('应用已加载完成')
  }, 500)
})
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #000000;
  background-color: #f2f2f7;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  /* 更好的全屏体验 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* iOS状态栏适配 */
.status-bar-spacer {
  height: env(safe-area-inset-top);
  background-color: transparent;
}

/* 适配iPhone X及以上机型的底部安全区域 */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
  background-color: transparent;
}
</style>
