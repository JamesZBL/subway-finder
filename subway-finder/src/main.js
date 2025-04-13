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

// 全屏模式处理函数
const enterFullscreen = () => {
  const element = document.documentElement;
  
  // 尝试不同的全屏API
  const requestFullscreen = element.requestFullscreen || 
                           element.webkitRequestFullscreen || 
                           element.mozRequestFullScreen || 
                           element.msRequestFullscreen;
  
  if (requestFullscreen) {
    requestFullscreen.call(element).catch((err) => {
      console.error('无法进入全屏模式:', err);
    });
  }
};

// 检测全屏状态变化
const setupFullscreenListeners = () => {
  const fullscreenChangeHandler = () => {
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      // 如果退出全屏，尝试重新进入
      setTimeout(enterFullscreen, 1000);
    }
  };
  
  // 监听各种全屏变化事件
  document.addEventListener('fullscreenchange', fullscreenChangeHandler);
  document.addEventListener('webkitfullscreenchange', fullscreenChangeHandler);
  document.addEventListener('mozfullscreenchange', fullscreenChangeHandler);
  document.addEventListener('MSFullscreenChange', fullscreenChangeHandler);
};

// 用户交互后尝试进入全屏
const setupUserInteractionListener = () => {
  const interactionEvents = ['click', 'touchstart', 'keydown'];
  
  const interactionHandler = () => {
    enterFullscreen();
    // 移除事件监听器，避免重复触发
    interactionEvents.forEach(event => {
      document.removeEventListener(event, interactionHandler);
    });
    
    // 设置全屏变化检测
    setupFullscreenListeners();
  };
  
  // 添加用户交互事件监听
  interactionEvents.forEach(event => {
    document.addEventListener(event, interactionHandler, { once: true });
  });
};

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

// 在DOM加载完成后设置全屏模式
document.addEventListener('DOMContentLoaded', () => {
  setupUserInteractionListener();
});
