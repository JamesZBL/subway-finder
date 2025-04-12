import { createApp } from 'vue'
import Toast from '../components/Toast.vue'

// 创建单例模式的toast管理器
let toastPool = []

export default {
  show(options) {
    if (typeof options === 'string') {
      options = { message: options }
    }
    
    const defaultOptions = {
      duration: 2000,
      type: 'info'
    }
    
    const mergedOptions = { ...defaultOptions, ...options }
    
    // 创建容器
    const container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
    
    // 清理之前的Toast实例
    this._clearPreviousToasts()
    
    // 创建Toast实例
    const toastApp = createApp(Toast, {
      ...mergedOptions
    })
    
    // 挂载
    const toastInstance = toastApp.mount(container)
    
    // 保存实例引用
    const toast = {
      id: Date.now(),
      container,
      instance: toastInstance,
      app: toastApp
    }
    
    toastPool.push(toast)
    
    // 设置定时器自动销毁
    setTimeout(() => {
      this._destroyToast(toast)
    }, mergedOptions.duration + 300) // 额外300ms确保动画完成
    
    return {
      close: () => {
        this._destroyToast(toast)
      }
    }
  },
  
  // 清理之前的Toast，保持屏幕整洁
  _clearPreviousToasts() {
    const maxToasts = 3 // 最多同时显示3个toast
    
    if (toastPool.length >= maxToasts) {
      // 从最旧的开始移除
      const oldestToasts = toastPool.slice(0, toastPool.length - maxToasts + 1)
      oldestToasts.forEach(toast => this._destroyToast(toast))
    }
  },
  
  // 销毁Toast实例
  _destroyToast(toast) {
    if (!toast) return
    
    try {
      document.body.removeChild(toast.container)
      toast.app.unmount()
      
      // 从池中移除
      const index = toastPool.findIndex(t => t.id === toast.id)
      if (index !== -1) {
        toastPool.splice(index, 1)
      }
    } catch (e) {
      console.error('Error destroying toast', e)
    }
  },
  
  info(message, duration) {
    return this.show({
      message,
      duration,
      type: 'info'
    })
  },
  
  success(message, duration) {
    return this.show({
      message,
      duration,
      type: 'success'
    })
  },
  
  warning(message, duration) {
    return this.show({
      message,
      duration,
      type: 'warning'
    })
  },
  
  error(message, duration) {
    return this.show({
      message,
      duration,
      type: 'error'
    })
  }
} 