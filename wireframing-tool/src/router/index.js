import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'
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
      meta: { requiresAuth: true },
    },
    {
      path: '/new-project',
      name: 'new-project',
      component: NewProjectView,
      meta: { requiresAuth: true },
    },
    {
      path: '/editor/:id',
      name: 'editor',
      component: EditorView,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
  ],
})

// Simple auth guard
router.beforeEach(async (to) => {
  if (!to.meta?.requiresAuth) return true
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
