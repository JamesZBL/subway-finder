<script setup>
import { onMounted } from 'vue'
import { useSubwayStore } from './stores/subwayStore'
import toast from './utils/toast'

const subwayStore = useSubwayStore()

onMounted(() => {
  // 加载本地存储的数据
  subwayStore.loadRunningData()
  
  // 测试Toast是否工作
  setTimeout(() => {
    toast.info('应用已加载完成')
  }, 500)
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">北京地铁线路</h1>
    </header>
    
    <main class="app-content">
      <router-view />
    </main>
  </div>
</template>

<style>
.app-container {
  font-family: 'PingFang SC', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #0052cc;
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-title {
  margin: 0;
  font-weight: 500;
  font-size: 1.5rem;
}

.app-content {
  flex: 1;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .app-content {
    padding: 0.5rem;
  }
}
</style>
