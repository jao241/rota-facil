import { createRouter, createWebHistory } from 'vue-router';
import AuthPage from './pages/AuthPage.vue';
import { refreshSession } from './auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: AuthPage, props: { mode: 'login' } },
    { path: '/register', name: 'register', component: AuthPage, props: { mode: 'register' } },
    { path: '/workspace', name: 'home', component: () => import('./pages/MapsPage.vue'), meta: { requiresAuth: true } },
    { path: '/workspace/maps/:id', name: 'map-details', component: () => import('./pages/MapDetailsPage.vue'), meta: { requiresAuth: true } },
    { path: '/workspace/map-preview', name: 'map-preview', component: () => import('./MapPreview.vue'), meta: { requiresAuth: true } },
  ],
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;
  const user = await refreshSession();
  if (!user) return { name: 'login', query: { redirect: to.fullPath } };
  return true;
});

export default router;
