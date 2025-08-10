import { createRouter, createWebHistory } from 'vue-router';
import Login from '@/pages/Login.vue';
import Register from '@/pages/Register.vue';
import Dashboard from '@/pages/Dashboard.vue';
import ScheduleManager from '@/pages/Admin/ScheduleManager.vue';
import { useAuthStore } from '@/store/auth';

const routes = [
  { path: '/', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/login', component: Login, meta: { guest: true } },
  { path: '/register', component: Register, meta: { guest: true } },
  { path: '/admin', component: ScheduleManager, meta: { requiresAuth: true, admin: true } }
];

const router = createRouter({ history: createWebHistory(), routes });
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.user) return next('/login');
  if (to.meta.guest && auth.user) return next('/');
  if (to.meta.admin && auth.user?.role !== 'admin') return next('/');
  next();
});
export default router;