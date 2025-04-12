import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

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
