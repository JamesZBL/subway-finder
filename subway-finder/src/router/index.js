import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import LinesPage from '../views/LinesPage.vue'
import StationsPage from '../views/StationsPage.vue'
import DirectionsPage from '../views/DirectionsPage.vue'
import MapPage from '../views/MapPage.vue'
import DetailsPage from '../views/DetailsPage.vue'
import EstimatePage from '../views/EstimatePage.vue'

const router = createRouter({
  history: createWebHistory('/subway-finder/'),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/lines',
      name: 'lines',
      component: LinesPage
    },
    {
      path: '/stations',
      name: 'stations',
      component: StationsPage
    },
    {
      path: '/directions',
      name: 'directions',
      component: DirectionsPage
    },
    {
      path: '/map',
      name: 'map',
      component: MapPage
    },
    {
      path: '/details',
      name: 'details',
      component: DetailsPage
    },
    {
      path: '/estimate',
      name: 'estimate',
      component: EstimatePage
    }
  ]
})

export default router 