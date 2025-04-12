<script setup>
import { onMounted } from 'vue'
import { useSubwayStore } from './stores/subwayStore'
import toast from './utils/toast'

const subwayStore = useSubwayStore()

onMounted(() => {
  // 加载本地存储的数据
  subwayStore.loadRunningData()
  
  // 添加适配移动设备的meta标签
  const meta = document.createElement('meta')
  meta.name = 'viewport'
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  document.head.appendChild(meta)
  
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

@media (prefers-color-scheme: dark) {
  .app-container {
    color: #ffffff;
    background-color: #000000;
  }
}
</style>
