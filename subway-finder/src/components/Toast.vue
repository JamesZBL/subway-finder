<script setup>
import { defineProps, onMounted, ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 2000
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
  }
})

const visible = ref(false)
const timer = ref(null)

onMounted(() => {
  // 使用nextTick确保DOM已渲染
  setTimeout(() => {
    visible.value = true
  }, 10)
  
  timer.value = setTimeout(() => {
    visible.value = false
  }, props.duration)
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
})
</script>

<template>
  <transition name="toast-fade">
    <div 
      v-if="visible" 
      class="toast" 
      :class="[`toast-${type}`]"
    >
      {{ message }}
    </div>
  </transition>
</template>

<style>
/* 全局样式，确保toast容器正确显示 */
.toast-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  pointer-events: none;
}
</style>

<style scoped>
.toast {
  position: relative;
  max-width: 80vw;
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  pointer-events: none;
  margin-bottom: 10px;
  text-align: center;
}

.toast-info {
  background-color: rgba(0, 0, 0, 0.9);
}

.toast-success {
  background-color: rgba(0, 0, 0, 0.9);
}

.toast-warning {
  background-color: rgba(0, 0, 0, 0.9);
}

.toast-error {
  background-color: rgba(0, 0, 0, 0.9);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(0);
  scale: 0.9;
}

@media (max-width: 768px) {
  .toast {
    max-width: 90vw;
    font-size: 15px;
    padding: 10px 20px;
  }
}
</style> 