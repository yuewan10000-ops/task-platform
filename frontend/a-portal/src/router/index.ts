import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import LanguageView from '../views/LanguageView.vue';
import ServiceView from '../views/ServiceView.vue';
import DashboardView from '../views/DashboardView.vue';
import HomeView from '../views/HomeView.vue';
import OrderView from '../views/OrderView.vue';
import PreOrderView from '../views/PreOrderView.vue';
import MineView from '../views/MineView.vue';
import RechargeView from '../views/RechargeView.vue';
import InviteView from '../views/InviteView.vue';
import WithdrawView from '../views/WithdrawView.vue';
import AddWithdrawalMethodView from '../views/AddWithdrawalMethodView.vue';
import RechargeRecordView from '../views/RechargeRecordView.vue';
import WithdrawRecordView from '../views/WithdrawRecordView.vue';
import ChangePasswordView from '../views/ChangePasswordView.vue';
import ChangePaymentPasswordView from '../views/ChangePaymentPasswordView.vue';
import ChatServiceView from '../views/ChatServiceView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/dashboard', redirect: '/home' },
    { path: '/login', name: 'login', component: LoginView },
    { path: '/register', name: 'register', component: RegisterView },
    { path: '/lang', name: 'lang', component: LanguageView },
    { 
      path: '/service', 
      name: 'service', 
      component: ServiceView,
      meta: { requiresAuth: true },
    },
    { 
      path: '/dashboard', 
      name: 'dashboard', 
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView, // 使用HomeView作为首页
      meta: { requiresAuth: true },
    },
    {
      path: '/order',
      name: 'order',
      component: OrderView,
      meta: { requiresAuth: true },
    },
    {
      path: '/pre-order',
      name: 'pre-order',
      component: PreOrderView,
      meta: { requiresAuth: true },
    },
    {
      path: '/mine',
      name: 'mine',
      component: MineView,
      meta: { requiresAuth: true },
    },
    {
      path: '/withdraw',
      name: 'withdraw',
      component: WithdrawView,
      meta: { requiresAuth: true },
    },
    {
      path: '/invite',
      name: 'invite',
      component: InviteView,
      meta: { requiresAuth: true },
    },
    {
      path: '/recharge',
      name: 'recharge',
      component: RechargeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/add-withdrawal-method',
      name: 'add-withdrawal-method',
      component: AddWithdrawalMethodView,
      meta: { requiresAuth: true },
    },
    {
      path: '/recharge-record',
      name: 'recharge-record',
      component: RechargeRecordView,
      meta: { requiresAuth: true },
    },
    {
      path: '/withdraw-record',
      name: 'withdraw-record',
      component: WithdrawRecordView,
      meta: { requiresAuth: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: ChangePasswordView,
      meta: { requiresAuth: true },
    },
    {
      path: '/change-payment-password',
      name: 'change-payment-password',
      component: ChangePaymentPasswordView,
      meta: { requiresAuth: true },
    },
    {
      path: '/chat-service',
      name: 'chat-service',
      component: ChatServiceView,
      meta: { requiresAuth: true },
    },
  ],
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  authStore.initAuth();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/home');
  } else {
    next();
  }
});

export default router;

