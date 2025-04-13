import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// 强制使用浅色模式
document.documentElement.classList.add('light-mode')
document.documentElement.setAttribute('data-theme', 'light')

// 强制覆盖系统颜色方案，即使是在暗色模式下也使用浅色样式
if (window.matchMedia) {
  // 创建一个可以监听颜色方案变化的媒体查询
  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  // 定义一个强制应用浅色模式的函数
  const forceLight = () => {
    document.documentElement.classList.add('light-mode')
    document.documentElement.setAttribute('data-theme', 'light')
    
    // 尝试修改meta标签
    const metaTag = document.querySelector('meta[name="color-scheme"]')
    if (metaTag) {
      metaTag.content = 'light'
    }
  }
  
  // 初始时应用强制浅色模式
  forceLight()
  
  // 当系统颜色方案变化时，重新应用浅色模式
  colorSchemeQuery.addEventListener('change', forceLight)
}

// 全局Toast插件
import Toast from './components/Toast.vue'
import toast from './utils/toast'

// 创建应用实例
const app = createApp(App)

// 配置Pinia存储
const pinia = createPinia()
app.use(pinia)

// 配置路由
app.use(router)

// 全局注册Toast组件
app.component('Toast', Toast)

// 全局提供toast方法
app.config.globalProperties.$toast = toast

// 挂载应用
app.mount('#app')
