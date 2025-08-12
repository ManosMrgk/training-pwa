import { createRouter, createWebHistory } from 'vue-router';
import Login from '@/pages/Login.vue';
import Register from '@/pages/Register.vue';
import Dashboard from '@/pages/Dashboard.vue';
import ScheduleManager from '@/pages/Admin/ScheduleManager.vue';
import Programs from '@/pages/Admin/Programs.vue';
import Offline from '@/pages/Offline.vue';
import { useAuthStore } from '@/store/auth';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/register', component: Register, meta: { guest: true } },
  { path: '/admin', component: ScheduleManager, meta: { requiresAuth: true, admin: true } },
  { path: '/admin/programs', component: Programs, meta: { requiresAuth: true, admin: true } },
  { path: '/offline', component: Offline, meta: { requiresAuth: false } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory('/training-pwa/'), routes });
router.beforeEach(async (to, from, next) => {

  if (!navigator.onLine && to.path !== '/offline') {
    return next({ path: '/offline', query: { redirect: to.fullPath } })
  }

  const auth = useAuthStore()

  try {
    if (typeof auth.ensureReady === 'function') {
      await auth.ensureReady()
    } else if (!(auth as any).isReady && typeof (auth as any).init === 'function') {
      await (auth as any).init()
    }
  } catch (e) {
    // return
    console.warn('Auth ensureReady failed:', e)
  }


  if (to.meta.requiresAuth && !auth.user) return next('/login')
  if (to.meta.guest && auth.user) return next('/')
  if (to.meta.admin && auth.user?.role !== 'admin') return next('/')
  next()
});
export default router;