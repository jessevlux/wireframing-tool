import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import NewProjectView from '../views/NewProjectView.vue'
import EditorView from '../views/EditorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/new-project',
      name: 'new-project',
      component: NewProjectView,
    },
    {
      path: '/editor/:id',
      name: 'editor',
      component: EditorView,
    },
  ],
})

export default router
