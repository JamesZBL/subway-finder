import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomePage.vue')
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('../views/MapPage.vue')
  },
  {
    path: '/lines',
    name: 'Lines',
    component: () => import('../views/LinesPage.vue')
  },
  {
    path: '/directions',
    name: 'Directions',
    component: () => import('../views/DirectionsPage.vue'),
    props: route => ({
      lineId: route.query.lineId,
      mode: route.query.mode
    })
  },
  {
    path: '/stations',
    name: 'Stations',
    component: () => import('../views/StationsPage.vue'),
    props: route => ({ 
      lineId: route.query.lineId,
      mode: route.query.mode,
      direction: route.query.direction
    })
  }
]

// 获取基础路径，用于GitHub Pages部署
const base = import.meta.env.BASE_URL || '/subway-finder/'

const router = createRouter({
  history: createWebHistory(base),
  routes
})

export default router 