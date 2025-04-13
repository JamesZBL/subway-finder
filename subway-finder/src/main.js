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

// 检测是否是作为主屏幕应用运行
const isInStandaloneMode = () => {
  return window.navigator.standalone ||               // iOS Safari
         window.matchMedia('(display-mode: standalone)').matches; // 其他浏览器
};

// iOS专用全屏处理
const handleIOSFullscreen = () => {
  // 添加iOS全屏特定样式
  document.documentElement.classList.add('ios-webapp');
  
  // 禁用所有链接的默认行为，防止打开新窗口
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (target && target.getAttribute('href')) {
      e.preventDefault();
      
      const href = target.getAttribute('href');
      // 如果是内部链接，使用路由导航
      if (href.startsWith('/') || href.startsWith('#')) {
        router.push(href);
      } else {
        // 外部链接可以选择在新窗口打开
        window.open(href, '_blank');
      }
    }
  });
};

// 全屏模式处理函数（适用于非iOS WebApp）
const enterFullscreen = () => {
  // 如果已经是主屏幕应用，不需要再请求全屏
  if (isInStandaloneMode()) {
    console.log('已经在WebApp模式下运行，不需要全屏请求');
    
    // 如果是iOS主屏幕应用，添加特殊处理
    if (window.navigator.standalone) {
      handleIOSFullscreen();
    }
    return;
  }
  
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
  // 路由变化时尝试保持全屏状态
  router.afterEach(() => {
    if (!isInStandaloneMode() && 
        !document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      // 页面切换后尝试重新进入全屏
      setTimeout(enterFullscreen, 100);
    }
  });

  const fullscreenChangeHandler = () => {
    if (!isInStandaloneMode() && 
        !document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      // 如果退出全屏，尝试重新进入
      setTimeout(enterFullscreen, 100);
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
  // 如果已经是WebApp模式，直接设置相关处理
  if (isInStandaloneMode()) {
    console.log('WebApp模式检测：已添加相关处理');
    
    // 如果是iOS主屏幕应用，添加特殊处理
    if (window.navigator.standalone) {
      handleIOSFullscreen();
    }
    
    // 仍然设置路由监听以确保全屏体验
    router.afterEach(() => {
      document.documentElement.classList.add('in-webapp-mode');
      // 重设页面的滚动位置，确保全屏视图
      window.scrollTo(0, 0);
    });
    
    return;
  }
  
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

// 路由导航结束后检查全屏状态
router.afterEach(() => {
  // 如果不是WebApp模式，且不在全屏状态，尝试重新进入全屏
  if (!isInStandaloneMode() && 
      !document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && 
      !document.msFullscreenElement) {
    setTimeout(enterFullscreen, 100);
  }
});

// 全局注册Toast组件
app.component('Toast', Toast)

// 全局提供toast方法
app.config.globalProperties.$toast = toast

// 挂载应用
app.mount('#app')

// 在DOM加载完成后设置全屏模式
document.addEventListener('DOMContentLoaded', () => {
  setupUserInteractionListener();
  
  // 调用 iOS WebApp 特殊处理
  if (window.navigator.standalone) {
    setupIOSWebApp();
  }
  
  // 如果已经在WebApp模式下运行，立即应用WebApp样式
  if (window.isInStandaloneMode && window.isInStandaloneMode()) {
    document.documentElement.classList.add('ios-webapp-mode');
    document.body.classList.add('ios-webapp-mode');
  }
});

// 处理iOS WebApp相关的特殊逻辑
const setupIOSWebApp = () => {
  if (window.navigator.standalone) {
    console.log('正在启用 iOS WebApp 模式特殊处理');
    
    // 给 html 和 body 添加 iOS WebApp 模式标识类
    document.documentElement.classList.add('ios-webapp-mode');
    document.body.classList.add('ios-webapp-mode');
    
    // 确保 viewport 正确设置
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    }
    
    // 为适配刘海屏设置状态栏样式
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) {
      statusBarMeta.content = 'black-translucent';
    }
    
    // 禁用双击缩放
    document.addEventListener('dblclick', (e) => {
      e.preventDefault();
    });
    
    // 禁用双指缩放
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 处理页面滚动到顶部
    window.scrollTo(0, 0);
    
    // 监听页面大小变化，确保内容正确显示
    window.addEventListener('resize', () => {
      // 延迟执行以确保 iOS Safari 正确处理
      setTimeout(() => {
        window.scrollTo(0, 0);
        
        // 重新应用 WebApp 模式样式
        document.documentElement.classList.add('ios-webapp-mode');
        document.body.classList.add('ios-webapp-mode');
      }, 50);
    });
    
    // 禁用橡皮筋效果
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';
  }
};
