<script setup>
import { useRouter } from 'vue-router'
import { useSubwayStore } from '../stores/subwayStore'

const router = useRouter()
const subwayStore = useSubwayStore()

// 导航到采集运行数据页面
const navigateToCollection = () => {
  subwayStore.setMode('collection')
  router.push('/lines')
}

// 导航到开始展示页面
const navigateToDisplay = () => {
  subwayStore.setMode('display')
  router.push('/lines')
}
</script>

<template>
  <div class="fullscreen-page">
    <div class="status-bar-spacer"></div>
    
    <div class="ios-navbar">
      <h1>北京地铁</h1>
    </div>
    
    <div class="home-container">
      <div class="subway-image">
        <img src="/images/Beijing Rail Transit Lines.png" alt="北京地铁线路图" class="map-preview">
      </div>
      
      <div class="action-buttons">
        <button class="ios-button collection" @click="navigateToCollection">
          采集运行数据
        </button>
        
        <button class="ios-button display" @click="navigateToDisplay">
          开始展示
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.subway-image {
  width: 100%;
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-preview {
  width: 100%;
  height: auto;
  display: block;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.ios-button {
  height: 50px;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.ios-button.collection {
  background-color: #34c759;
}

.ios-button.display {
  background-color: #007aff;
}

.ios-button:active {
  opacity: 0.8;
  transform: scale(0.98);
}
</style> 