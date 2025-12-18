import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import MainLayout from '../layouts/MainLayout.vue';
import MemberListView from '../views/MemberListView.vue';
import OrderSettingsView from '../views/OrderSettingsView.vue';
import AddOrderSettingView from '../views/AddOrderSettingView.vue';
import TransactionView from '../views/TransactionView.vue';
import RechargeManageView from '../views/RechargeManageView.vue';
import WithdrawListView from '../views/WithdrawListView.vue';
import RechargeListView from '../views/RechargeListView.vue';
import CommissionRateManageView from '../views/CommissionRateManageView.vue';
import ProductPriceConfigView from '../views/ProductPriceConfigView.vue';
import ProductManageView from '../views/ProductManageView.vue';
import InjectionPlanView from '../views/InjectionPlanView.vue';
import TeamView from '../views/TeamView.vue';
import SupportChatView from '../views/SupportChatView.vue';
import SubUserManageView from '../views/SubUserManageView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      component: MainLayout,
      meta: { requiresAuth: true },
      redirect: '/members',
      children: [
        {
          path: 'members',
          name: 'members',
          component: MemberListView,
        },
        {
          path: 'orders/:userId',
          name: 'order-settings',
          component: OrderSettingsView,
        },
        {
          path: 'orders/:userId/add',
          name: 'order-settings-add',
          component: AddOrderSettingView,
        },
        {
          path: 'finance/recharge',
          name: 'finance-recharge',
          component: RechargeListView,
        },
        {
          path: 'finance/recharge/manage',
          name: 'finance-recharge-manage',
          component: RechargeManageView,
        },
        {
          path: 'finance/withdraw',
          name: 'finance-withdraw',
          component: WithdrawListView,
          meta: { requiresAuth: true },
        },
        {
          path: 'data/commission-rate',
          name: 'data-commission-rate',
          component: CommissionRateManageView,
        },
        {
          path: 'data/product-price',
          name: 'data-product-price',
          component: ProductPriceConfigView,
        },
        {
          path: 'data/products',
          name: 'data-products',
          component: ProductManageView,
        },
        {
          path: 'injection-plan/:userId',
          name: 'injection-plan',
          component: InjectionPlanView,
        },
        {
          path: 'team/:userId',
          name: 'team',
          component: TeamView,
        },
        {
          path: 'support',
          name: 'support',
          component: SupportChatView,
        },
        {
          path: 'sub-users',
          name: 'sub-users',
          component: SubUserManageView,
          meta: { requiresAdmin: true }, // 仅admin可访问
        },
      ],
    },
  ],
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  authStore.initAuth();

  console.log('路由守卫:', {
    path: to.path,
    requiresAuth: to.meta.requiresAuth,
    isAuthenticated: authStore.isAuthenticated,
    token: authStore.token || localStorage.getItem('admin-token'),
  });

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('需要认证但未登录，跳转到登录页');
    next('/login');
    return;
  }

  // 检查是否是子用户
  const user = authStore.user;
  const isSubUser = user?.isSubUser || false;

  // 子用户允许访问的路径：会员列表、充值、取款、打针、做单、查看团队
  const subUserAllowedPaths = [
    '/members',
    '/finance/recharge',
    '/finance/withdraw',
    '/injection-plan',  // 打针
    '/orders',          // 做单
    '/team',            // 查看团队
  ];
  const isSubUserAllowedPath = subUserAllowedPaths.some(path => to.path.startsWith(path));

  if (isSubUser && !isSubUserAllowedPath && to.path !== '/') {
    console.log('子用户无权访问此页面，跳转到会员列表');
    next('/members');
    return;
  }

  // 检查是否需要admin权限
  if (to.meta.requiresAdmin && isSubUser) {
    console.log('需要admin权限，但当前是子用户，跳转到会员列表');
    next('/members');
    return;
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    console.log('已登录，跳转到会员列表');
    next('/members');
  } else {
    next();
  }
});

export default router;

