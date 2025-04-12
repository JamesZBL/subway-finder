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
  <div class="home-container">
    <div class="subway-image">
      <img src="/images/Beijing Rail Transit Lines.png" alt="北京地铁线路图" class="map-preview">
    </div>
    
    <div class="action-buttons">
      <button class="action-button collection" @click="navigateToCollection">
        <span class="icon">📝</span>
        <span class="text">采集运行数据</span>
      </button>
      
      <button class="action-button display" @click="navigateToDisplay">
        <span class="icon">🚄</span>
        <span class="text">开始展示</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
}

.subway-image {
  width: 100%;
  max-width: 800px;
  margin-bottom: 2rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.map-preview {
  width: 100%;
  height: auto;
  display: block;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 400px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  gap: 0.5rem;
}

.action-button.collection {
  background-color: #4CAF50;
}

.action-button.display {
  background-color: #2196F3;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.icon {
  font-size: 1.5rem;
}

@media (min-width: 768px) {
  .action-buttons {
    flex-direction: row;
    max-width: 600px;
  }
  
  .action-button {
    flex: 1;
  }
}
</style> 