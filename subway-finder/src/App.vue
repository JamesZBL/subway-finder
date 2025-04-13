<script setup>
import { onMounted, watch } from 'vue'
import { useSubwayStore } from './stores/subwayStore'
import { useRoute } from 'vue-router'
import toast from './utils/toast'

const subwayStore = useSubwayStore()
const route = useRoute()

// 检测是否是 WebApp 模式
const isInStandaloneMode = () => {
  return window.navigator.standalone ||               // iOS Safari
         window.matchMedia('(display-mode: standalone)').matches; // 其他浏览器
};

// 进入全屏模式函数
const enterFullscreen = () => {
  // 如果已经在WebApp模式运行，不需要全屏API
  if (isInStandaloneMode()) {
    console.log('已经在WebApp模式下运行，不需要全屏请求');
    return;
  }
  
  const element = document.documentElement;
  
  // 尝试不同的全屏API
  if (element.requestFullscreen) {
    element.requestFullscreen().catch(e => console.error('全屏请求失败:', e));
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen().catch(e => console.error('全屏请求失败:', e));
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen().catch(e => console.error('全屏请求失败:', e));
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen().catch(e => console.error('全屏请求失败:', e));
  }
};

// 处理全屏状态变化
const handleFullscreenChange = () => {
  // 如果已经在WebApp模式运行，不需要监听全屏状态
  if (isInStandaloneMode()) {
    return;
  }
  
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
    }, 100);
  }
};

// 处理iOS WebApp相关的特殊逻辑
const setupIOSWebApp = () => {
  if (window.navigator.standalone) {
    // 给body添加iOS WebApp类
    document.documentElement.classList.add('ios-webapp-mode');
    document.body.classList.add('ios-webapp-mode');
    
    // iOS WebApp不会自动更新滚动位置
    window.scrollTo(0, 0);
  }
};

// 监听路由变化以保持全屏状态
watch(() => route.path, () => {
  // 路由变化时滚动到顶部
  window.scrollTo(0, 0);
  
  // 如果在iOS WebApp模式下，处理特殊情况
  if (window.navigator.standalone) {
    setupIOSWebApp();
  } else if (!isInStandaloneMode()) {
    // 检查是否仍然在全屏状态，如果不是，尝试重新进入
    setTimeout(() => {
      if (!document.fullscreenElement && 
          !document.webkitFullscreenElement && 
          !document.mozFullScreenElement && 
          !document.msFullscreenElement) {
        enterFullscreen();
      }
    }, 100);
  }
});

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
  
  // 检测并设置iOS WebApp特殊处理
  if (isInStandaloneMode()) {
    setupIOSWebApp();
  } else {
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
  }
  
  // 禁止页面缩放
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault()
    }
  }, { passive: false })
  
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
  /* 移除可能导致空白的内边距 */
  padding: 0;
  margin: 0;
}

/* iOS状态栏适配 */
.status-bar-spacer {
  height: env(safe-area-inset-top);
  background-color: transparent;
  margin: 0;
  padding: 0;
}

/* 适配iPhone X及以上机型的底部安全区域 */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
  background-color: transparent;
  margin: 0;
  padding: 0;
}

/* iOS WebApp 模式下的特殊样式 */
html.ios-webapp-mode, 
body.ios-webapp-mode {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.ios-webapp-mode .app-container {
  height: 100vh;
  height: -webkit-fill-available;
  padding: 0;
  margin: 0;
}

.ios-webapp-mode .fullscreen-page {
  padding: 0;
  margin: 0;
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
</style>
