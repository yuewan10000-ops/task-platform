<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { getUserInfo, updateUserBalance, type UserInfo } from '../api/user';
import {
  getOrderSetting,
  getOrderRecords,
  createOrderRecord,
  type OrderRecord,
} from '../api/orders';
import { getProductPriceConfig, type ProductPriceConfig } from '../api/productPriceConfig';
import { getActiveCommissionRate, type CommissionRate } from '../api/commissionRate';
import { getActiveProducts, type Product } from '../api/products';
import { getInjectionPlans, type InjectionPlan } from '../api/injectionPlans';

const router = useRouter();
const authStore = useAuthStore();
const PENDING_KEY = 'pendingInjectionOrder';

const userInfo = ref<UserInfo | null>(null);
const loading = ref(false);
const error = ref('');
const settingLoading = ref(false);
const recordsLoading = ref(false);
const orderRecords = ref<OrderRecord[]>([]);
const orderSetting = ref<any | null>(null);
const starsRotating = ref(false); // 星星旋转状态
const showOrderModal = ref(false); // 订单信息弹窗显示状态
const orderInfo = ref<{
  productImage: string;
  productName: string;
  productInfo: string;
  price: number;
  commission: number;
  needsInjection?: boolean;
  injectionAmount?: number;
  needsTopUp?: boolean;
  topUpAmount?: number;
  baseBalance?: number; // 生成订单时的基准余额（用于固定订单金额）
  displayBalance?: number; // 在弹窗中显示的余额（订单进行中保持不变）
} | null>(null);
const productPriceConfig = ref<ProductPriceConfig | null>(null); // 价格比例配置
const commissionRate = ref<CommissionRate | null>(null); // 佣金比例
const products = ref<Product[]>([]); // 商品列表
const injectionPlans = ref<InjectionPlan[]>([]); // 打针计划列表
let refreshInterval: number | null = null; // 自动刷新定时器

const loadPendingOrder = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[PreOrder] Failed to load pending order', e);
    return null;
  }
};

const savePendingOrder = (info: any) => {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('[PreOrder] Failed to save pending order', e);
  }
};

const clearPendingOrder = () => {
  sessionStorage.removeItem(PENDING_KEY);
};

const availableOrders = computed(() => {
  if (!orderSetting.value) {
    console.log('[PreOrder] No order setting, availableOrders = 0');
    return 0;
  }
  
  // 只计算该OrderSetting创建之后的已完成订单
  const settingCreatedAt = new Date(orderSetting.value.createdAt).getTime();
  const completed = orderRecords.value.filter((r) => {
    if (r.status !== 'completed') return false;
    const recordCreatedAt = new Date(r.createdAt).getTime();
    // 只统计在该OrderSetting创建之后完成的订单
    return recordCreatedAt >= settingCreatedAt;
  }).length;
  
  const available = Math.max(orderSetting.value.maxOrders - completed, 0);
  console.log('[PreOrder] Order setting:', {
    maxOrders: orderSetting.value.maxOrders,
    completed,
    available,
    orderSettingId: orderSetting.value.id,
    settingCreatedAt: new Date(orderSetting.value.createdAt).toISOString(),
    totalRecords: orderRecords.value.length,
  });
  return available;
});

const remainingOrders = computed(() => availableOrders.value);

// 计算当前是第几个订单（基于当前OrderSetting）
const currentOrderNumber = computed(() => {
  if (!orderSetting.value) return 0;
  
  const settingCreatedAt = new Date(orderSetting.value.createdAt).getTime();
  const completed = orderRecords.value.filter((r) => {
    if (r.status !== 'completed') return false;
    const recordCreatedAt = new Date(r.createdAt).getTime();
    return recordCreatedAt >= settingCreatedAt;
  }).length;
  
  return completed + 1; // 下一个订单的序号
});

const formatCurrency = (value: number | undefined) => {
  const num = Number(value || 0);
  return `$${num.toFixed(2)}`;
};

const fetchData = async () => {
  if (!authStore.user?.id) {
    router.push('/login');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = await getUserInfo(authStore.user.id);
    userInfo.value = data;

    settingLoading.value = true;
    const setting = await getOrderSetting(authStore.user.id);
    console.log('[PreOrder] Initial order setting:', setting);
    orderSetting.value = setting;
    settingLoading.value = false;

    recordsLoading.value = true;
    const records = await getOrderRecords(authStore.user.id);
    console.log('[PreOrder] Initial order records:', records.length, 'records');
    orderRecords.value = records;
    recordsLoading.value = false;
    
    // 获取价格比例配置、佣金比例、商品列表和打针计划
    try {
      productPriceConfig.value = await getProductPriceConfig();
      commissionRate.value = await getActiveCommissionRate();
      products.value = await getActiveProducts();
      
      // 获取打针计划
      console.log('[PreOrder] Fetching injection plans for user:', authStore.user.id);
      const plans = await getInjectionPlans(authStore.user.id);
      console.log('[PreOrder] Fetched injection plans:', plans);
      injectionPlans.value = plans;
    } catch (e: any) {
      console.error('Failed to load product price config, commission rate, products or injection plans:', e);
      console.error('Error details:', e?.message, e?.stack);
      // 如果获取失败，使用默认值
      productPriceConfig.value = null;
      commissionRate.value = null;
      products.value = [];
      injectionPlans.value = [];
    }
  } catch (e: any) {
    error.value = e?.message || '加载失败，请稍后重试';
    settingLoading.value = false;
    recordsLoading.value = false;
  } finally {
    loading.value = false;
  }
};

// 确保始终生成可展示的订单信息（包含商品图片、金额、佣金）
const generateOrderInfo = () => {
  if (!userInfo.value) {
    return {
      productImage: 'https://via.placeholder.com/200x200/FF6B9D/FFFFFF?text=Product',
      productName: 'Product',
      productInfo: 'Product information',
      price: 0,
      commission: 0,
      needsInjection: false,
      injectionAmount: 0,
    };
  }

  // 使用可用商品：优先启用的商品，否则退回全部商品
  const activeProducts = products.value.filter(p => p.isActive);
  const availableProducts = activeProducts.length > 0 ? activeProducts : products.value;
  console.log('[PreOrder] Available products:', availableProducts.length, availableProducts);

  let selectedProduct: Product | null = null;
  if (availableProducts.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableProducts.length);
    selectedProduct = availableProducts[randomIndex];
    console.log('[PreOrder] Selected product:', selectedProduct);
  } else {
    console.warn('[PreOrder] No products available, using placeholder image');
  }

  // 价格配置兜底（当接口异常或未返回时，使用 1~1.2 的默认区间避免显示 0）
  const fallbackPriceConfig = { minRate: 1, maxRate: 1.2 };
  const priceConfig = productPriceConfig.value || fallbackPriceConfig;
  
  // 获取用户余额（用于计算订单金额）
  const userBalance = userInfo.value.user.balance;
  
  // 检查是否有匹配的打针计划
  const orderNum = currentOrderNumber.value;
  console.log('[PreOrder] ===== Generating Order Info =====');
  console.log('[PreOrder] Current order number:', orderNum);
  console.log('[PreOrder] Available injection plans count:', injectionPlans.value.length);
  console.log('[PreOrder] Available injection plans:', JSON.stringify(injectionPlans.value, null, 2));
  console.log('[PreOrder] Order setting:', orderSetting.value);
  console.log('[PreOrder] Order records count:', orderRecords.value.length);
  
  // 查找匹配的打针计划（优先匹配指定订单号的，如果没有则匹配所有订单的）
  const matchingPlan = injectionPlans.value.find(plan => {
    if (!plan.isActive) {
      console.log('[PreOrder] Plan is not active:', plan);
      return false;
    }
    // 如果orderSettingId为空或null，表示应用到所有订单
    if (!plan.orderSettingId) {
      console.log('[PreOrder] Plan applies to all orders:', plan);
      return true;
    }
    // 如果orderSettingId等于当前订单号，则匹配
    const matches = plan.orderSettingId === orderNum;
    console.log('[PreOrder] Checking plan:', { planOrderNum: plan.orderSettingId, currentOrderNum: orderNum, matches });
    return matches;
  });
  
  let price = 0;
  let commission = 0;
  let needsInjection = false;
  let injectionAmount = 0;
  
  if (matchingPlan) {
    // 使用打针计划的逻辑
    console.log('[PreOrder] Found matching injection plan:', matchingPlan);
    needsInjection = true;
    injectionAmount = Number(matchingPlan.injectionAmount);
    
    // 订单金额应该固定不变：订单金额 = 初始余额 + 打针金额
    // 但是，由于我们无法知道"初始余额"，我们需要计算：
    // 如果用户已经充值，当前余额 = 初始余额 + 充值金额
    // 订单金额 = 初始余额 + 打针金额 = (当前余额 - 充值金额) + 打针金额
    // 但是，我们无法知道充值金额，所以使用另一种方法：
    // 订单金额 = 当前余额 - 充值金额 + 打针金额
    // 但是，更简单的方法是：订单金额 = 初始余额 + 打针金额（固定）
    // 由于我们无法知道初始余额，我们使用一个固定的计算方式：
    // 订单金额 = 用户余额（充值前） + 打针金额
    // 但是，如果用户已经充值，我们需要从当前余额中减去充值金额，得到初始余额
    // 实际上，根据用户需求，订单金额应该固定，所以我们需要：
    // 1. 在第一次生成订单时，保存订单金额
    // 2. 或者，使用一个固定的计算方式
    
    // 简化方案：订单金额 = 当前余额 + 打针金额 - 已充值金额
    // 但是，我们无法知道已充值金额，所以使用当前余额
    // 实际上，根据用户需求，订单金额应该固定为：初始余额 + 打针金额
    // 所以，我们需要在第一次生成订单时，计算并保存订单金额
    
    // 临时方案：使用当前余额计算订单金额
    // 如果用户已经充值，当前余额 = 初始余额 + 充值金额
    // 订单金额 = 初始余额 + 打针金额 = (当前余额 - 充值金额) + 打针金额
    // 但是，我们无法知道充值金额，所以使用：订单金额 = 当前余额 + 打针金额 - 充值金额
    // 更简单的方法：订单金额 = 当前余额 - 充值金额 + 打针金额
    // 但是，由于我们无法知道充值金额，我们使用一个固定的计算方式
    
    // 根据用户需求，订单金额应该固定不变
    // 所以，我们需要在第一次生成订单时，计算订单金额并保存
    // 但是，由于我们没有保存订单金额的机制，我们使用当前余额
    // 这意味着：如果用户充值了，订单金额会变化
    // 但是，根据用户需求，订单金额应该不变
    
    // 最终方案：订单金额 = 用户余额（充值前） + 打针金额
    // 由于我们无法知道充值前的余额，我们使用当前余额
    // 但是，如果用户已经充值，我们需要从当前余额中减去充值金额
    // 实际上，根据用户需求，订单金额应该固定，所以我们需要：
    // 订单金额 = 初始余额 + 打针金额（固定）
    // 由于我们无法知道初始余额，我们使用一个固定的计算方式：
    // 订单金额 = 用户余额（第一次生成订单时的余额） + 打针金额
    
    // 简化实现：使用当前余额计算订单金额
    // 如果用户已经充值，当前余额 = 初始余额 + 充值金额
    // 订单金额 = 初始余额 + 打针金额 = (当前余额 - 充值金额) + 打针金额
    // 但是，我们无法知道充值金额，所以使用：订单金额 = 当前余额 + 打针金额 - 充值金额
    // 更简单的方法：订单金额 = 当前余额 - 充值金额 + 打针金额
    // 但是，由于我们无法知道充值金额，我们使用当前余额
    
    // 订单金额应该固定不变：订单金额 = 基准余额（生成订单时的余额） + 打针金额
    // 如果订单信息已经存在且是打针订单，使用保存的基准余额
    // 否则，使用当前余额作为基准余额
    const baseBalance = orderInfo.value?.baseBalance ?? userBalance;
    
    // 订单金额 = 基准余额 + 打针金额（固定不变）
    // 例如：基准余额73286.45，打针金额111，订单金额 = 73286.45 + 111 = 73397.45
    price = baseBalance + injectionAmount;
    
    console.log('[PreOrder] Injection order calculation:', {
      baseBalance,
      injectionAmount,
      price,
      currentBalance: userBalance,
    });
    
    // 佣金 = 打针计划中的订单佣金
    commission = Number(matchingPlan.commissionRate);
  } else {
    // 使用原来的逻辑
    // 在B端设置的价格比例范围内随机生成一个比例
    const minRate = Number((priceConfig as any).minRate);
    const maxRate = Number((priceConfig as any).maxRate);
    const randomRate = minRate + Math.random() * (maxRate - minRate);
    
    // 计算订单价格：用户余额 × 随机比例
    price = userBalance * randomRate;
    
    // 获取全局佣金比例（B端统一设置）
    const globalRate = commissionRate.value
      ? Number(commissionRate.value.rate)
      : 0;
    
    // 获取用户个人佣金比例（从OrderSetting）
    const userRate = orderSetting.value?.commissionRate
      ? Number(orderSetting.value.commissionRate)
      : 0;
    
    // 最终佣金比例 = 全局佣金比例 + 用户个人佣金比例
    const finalCommissionRate = globalRate + userRate;
    
    // 计算佣金：订单价格 × 最终佣金比例
    commission = price * finalCommissionRate;
  }
  
  return {
    productImage: selectedProduct?.image || 'https://via.placeholder.com/200x200/FF6B9D/FFFFFF?text=Product',
    productName: selectedProduct?.name || 'Product',
    productInfo: selectedProduct?.description || 'Product information',
    price: price,
    commission: commission,
    needsInjection: needsInjection,
    injectionAmount: injectionAmount,
    baseBalance: needsInjection ? (orderInfo.value?.baseBalance ?? userBalance) : undefined, // 保存基准余额（仅打针订单）
  };
};

const completeOneOrder = async () => {
  if (!authStore.user?.id) {
    router.push('/login');
    return;
  }
  if (!orderSetting.value) {
    error.value = 'No available order settings';
    return;
  }
  if (availableOrders.value <= 0) {
    error.value = 'No available orders';
    return;
  }
  
  try {
    recordsLoading.value = true;
    
    // 先刷新用户信息，确保获取最新的余额（充值后余额会更新）
    console.log('[PreOrder] Refreshing user info before completing order...');
    const freshUserInfo = await getUserInfo(authStore.user.id);
    userInfo.value = freshUserInfo;
    console.log('[PreOrder] Updated user balance:', freshUserInfo.user.balance);
    
    // 不再阻断余额为0的情况，后面用差额提示
    if (!userInfo.value) {
      error.value = 'Insufficient balance';
      recordsLoading.value = false;
      return;
    }
    
    // 保存当前余额，用于在弹窗中显示（订单进行中保持不变）
    // 这个余额应该和页面顶部显示的余额一致
    const currentBalance = userInfo.value.user.balance;
    console.log('[PreOrder] Saving current balance for display:', currentBalance);
    
    // 生成/恢复订单信息
    const pending = loadPendingOrder();
    const previousOrderInfo = orderInfo.value;
    if (pending) {
      orderInfo.value = pending;
      // 兜底处理：如果缺少商品信息（可能是历史数据为空），重新填充
      if (!orderInfo.value.productImage || !orderInfo.value.productName) {
        const regenerated = generateOrderInfo();
        orderInfo.value.productImage = orderInfo.value.productImage || regenerated.productImage;
        orderInfo.value.productName = orderInfo.value.productName || regenerated.productName;
        orderInfo.value.productInfo = orderInfo.value.productInfo || regenerated.productInfo;
        orderInfo.value.price = orderInfo.value.price || regenerated.price;
        orderInfo.value.commission = orderInfo.value.commission || regenerated.commission;
      }
      console.log('[PreOrder] Restored pending order from session:', orderInfo.value);
    } else {
      orderInfo.value = generateOrderInfo();
    }
    
    // 保存显示余额（订单进行中保持不变）
    // 如果之前已经有订单信息且显示余额已设置，保持原有的显示余额；否则使用当前余额（与页面顶部一致）
    if (previousOrderInfo?.displayBalance !== undefined) {
      // 保持原有的显示余额（订单进行中不变）
      orderInfo.value.displayBalance = previousOrderInfo.displayBalance;
      console.log('[PreOrder] Maintaining displayBalance:', orderInfo.value.displayBalance);
    } else {
      // 第一次生成订单，使用当前余额（与页面顶部一致）
      orderInfo.value.displayBalance = currentBalance;
      console.log('[PreOrder] Set displayBalance to current balance:', orderInfo.value.displayBalance);
    }
    
    // 如果是打针订单且之前已经有订单信息，保持基准余额不变
    if (orderInfo.value.needsInjection && previousOrderInfo?.baseBalance !== undefined) {
      orderInfo.value.baseBalance = previousOrderInfo.baseBalance;
      // 重新计算订单金额（使用固定的基准余额）
      orderInfo.value.price = previousOrderInfo.baseBalance + orderInfo.value.injectionAmount!;
      console.log('[PreOrder] Maintaining fixed order price:', {
        baseBalance: orderInfo.value.baseBalance,
        injectionAmount: orderInfo.value.injectionAmount,
        price: orderInfo.value.price,
        displayBalance: orderInfo.value.displayBalance,
      });
    }
    
    // 检查余额是否足够
    let hasInsufficientBalance = false;
    let shortageAmount = 0;
    
    if (orderInfo.value.needsInjection) {
      // 打针订单：优先使用后端差额
      if (userInfo.value.difference !== null && userInfo.value.difference !== undefined) {
        shortageAmount = userInfo.value.difference;
        hasInsufficientBalance = shortageAmount > 0;
        console.log('[PreOrder] Using backend difference:', shortageAmount);
      } else if (userInfo.value.user.balance < orderInfo.value.price) {
        hasInsufficientBalance = true;
        shortageAmount = orderInfo.value.price - userInfo.value.user.balance;
        console.log('[PreOrder] Backend difference missing, fallback shortage:', shortageAmount);
      }
    } else {
      // 普通订单：只需要用户余额足够支付订单价格
      if (userInfo.value.user.balance < orderInfo.value.price) {
        hasInsufficientBalance = true;
        shortageAmount = orderInfo.value.price - userInfo.value.user.balance;
      }
    }
    
    // 余额已覆盖（或差额<=0），可直接完成
    if (shortageAmount <= 0) {
      hasInsufficientBalance = false;
      shortageAmount = 0;
      orderInfo.value.needsTopUp = false;
      orderInfo.value.topUpAmount = 0;
      clearPendingOrder();
      console.log('[PreOrder] Balance sufficient, proceed without top-up');
    }
    
    // 如果余额不足，直接显示弹窗提示充值，不执行订单
    if (hasInsufficientBalance) {
      // 确保显示余额已设置（使用当前余额，与页面顶部一致）
      if (!orderInfo.value.displayBalance) {
        orderInfo.value.displayBalance = currentBalance;
        console.log('[PreOrder] Set displayBalance for insufficient balance:', orderInfo.value.displayBalance);
      }
      recordsLoading.value = false;
      starsRotating.value = false;
      showOrderModal.value = true;
      // 在orderInfo中标记余额不足
      orderInfo.value.needsTopUp = true;
      orderInfo.value.topUpAmount = shortageAmount;
      savePendingOrder(orderInfo.value);
      console.log('[PreOrder] Saved pending order for recharge:', orderInfo.value.topUpAmount);
      return;
    }
    
    // 开始星星旋转动画
    starsRotating.value = true;
    
    // 等待旋转动画完成（1秒）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 从余额扣除商品金额
    await updateUserBalance(authStore.user.id, -orderInfo.value.price);
    
    // 创建订单记录（保存商品金额 + 简短描述，包含佣金）
    await createOrderRecord({
      userId: authStore.user.id,
      orderType: orderSetting.value.orderType || 'pre-order',
      amount: orderInfo.value.price,
      status: 'completed',
      commission: Number(orderInfo.value.commission || 0), // 将打针订单佣金回充到余额
      // 控制长度，避免列超限：仅存名称前80字符和佣金
      description: JSON.stringify({
        n: (orderInfo.value.productName || 'Order').slice(0, 80),
        c: Number(orderInfo.value.commission || 0),
      }),
    });
    
    // 更新显示余额：原余额 - 订单金额 + 佣金
    // 这样弹窗中显示的余额就是完成订单后的余额（加上佣金）
    if (orderInfo.value.displayBalance !== undefined) {
      orderInfo.value.displayBalance = orderInfo.value.displayBalance - orderInfo.value.price + orderInfo.value.commission;
      console.log('[PreOrder] Updated display balance after order completion:', {
        originalBalance: currentBalance,
        orderPrice: orderInfo.value.price,
        commission: orderInfo.value.commission,
        newDisplayBalance: orderInfo.value.displayBalance,
      });
    }
    
    // 清除挂起订单
    clearPendingOrder();

    // 重新拉取记录、用户信息、订单设置、商品列表和打针计划（在显示弹窗前刷新，确保佣金已累计，可用订单数正确，商品信息最新）
    orderRecords.value = await getOrderRecords(authStore.user.id);
    const data = await getUserInfo(authStore.user.id);
    userInfo.value = data;
    orderSetting.value = await getOrderSetting(authStore.user.id);
    // 刷新商品列表和打针计划，确保使用最新的商品信息和打针计划
    products.value = await getActiveProducts();
    injectionPlans.value = await getInjectionPlans(authStore.user.id);
    
    // 停止旋转，显示弹窗（此时佣金已累计到Today's commission和Total commission）
    starsRotating.value = false;
    showOrderModal.value = true;
  } catch (e: any) {
    error.value = e?.message || 'Failed to complete order, please try again';
    starsRotating.value = false;
    orderInfo.value = null;
  } finally {
    recordsLoading.value = false;
  }
};

const closeOrderModal = async () => {
  if (!orderInfo.value || !authStore.user?.id) {
    showOrderModal.value = false;
    orderInfo.value = null;
    return;
  }
  
  // 如果是需要充值的订单，跳转到充值页面
  if (orderInfo.value.needsTopUp) {
    showOrderModal.value = false;
    savePendingOrder(orderInfo.value);
    orderInfo.value = null;
    router.push('/recharge');
    return;
  }
  
  try {
    // 返还商品金额和佣金到余额
    const refundAmount = orderInfo.value.price + orderInfo.value.commission;
    await updateUserBalance(authStore.user.id, refundAmount);
    
    // 刷新用户信息、订单设置和订单记录
    const data = await getUserInfo(authStore.user.id);
    userInfo.value = data;
    
    // 刷新订单设置和订单记录，确保可用订单数正确更新
    orderSetting.value = await getOrderSetting(authStore.user.id);
    orderRecords.value = await getOrderRecords(authStore.user.id);
    
    // 关闭弹窗
    showOrderModal.value = false;
    orderInfo.value = null;
  } catch (e: any) {
    error.value = e?.message || 'Failed to refund, please try again';
  }
};

onMounted(() => {
  authStore.initAuth();
  if (!authStore.isAuthenticated) {
    router.push('/login');
    return;
  }
  fetchData();
  
  // 每5秒自动刷新一次数据，确保B端添加订单后A端能及时看到
  refreshInterval = window.setInterval(() => {
    if (authStore.user?.id) {
      console.log('[PreOrder] Auto refreshing data for user:', authStore.user.id);
      // 只刷新订单设置和订单记录，不刷新用户信息（避免频繁刷新余额）
      settingLoading.value = true;
      getOrderSetting(authStore.user.id)
        .then((setting) => {
          console.log('[PreOrder] Fetched order setting:', setting);
          orderSetting.value = setting;
          settingLoading.value = false;
        })
        .catch((e) => {
          console.error('[PreOrder] Failed to fetch order setting:', e);
          settingLoading.value = false;
        });
      
      recordsLoading.value = true;
      getOrderRecords(authStore.user.id)
        .then((records) => {
          console.log('[PreOrder] Fetched order records:', records.length, 'records');
          orderRecords.value = records;
          recordsLoading.value = false;
        })
        .catch((e) => {
          console.error('[PreOrder] Failed to fetch order records:', e);
          recordsLoading.value = false;
        });
      
      // 同时刷新商品列表和打针计划，确保获取最新的商品信息和打针计划
      getActiveProducts()
        .then((productList) => {
          console.log('[PreOrder] Fetched products:', productList.length, 'products');
          products.value = productList;
        })
        .catch((e) => {
          console.error('[PreOrder] Failed to fetch products:', e);
        });
      
      getInjectionPlans(authStore.user.id)
        .then((plans) => {
          console.log('[PreOrder] Auto-refresh: Fetched injection plans:', plans.length, 'plans');
          console.log('[PreOrder] Auto-refresh: Plans data:', JSON.stringify(plans, null, 2));
          injectionPlans.value = plans;
        })
        .catch((e) => {
          console.error('[PreOrder] Auto-refresh: Failed to fetch injection plans:', e);
          console.error('[PreOrder] Auto-refresh: Error details:', e?.message, e?.stack);
        });
    }
  }, 5000);
});

onUnmounted(() => {
  // 清理定时器
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});
</script>

<template>
  <div class="pre-order">
    <header class="section-title">
      <span class="pin">📌</span>
      <span>Commission details</span>
    </header>

    <section class="cards">
      <div class="card balance-card">
        <div class="card-label">Account balance</div>
        <div class="card-value">
          {{ formatCurrency(userInfo?.user.balance) }}
        </div>
      </div>
      <div class="card column-card">
        <div class="sub-card today">
          <div class="sub-label">Today's commission</div>
          <div class="sub-value">{{ formatCurrency(userInfo?.todayCommission) }}</div>
        </div>
        <div class="sub-card total">
          <div class="sub-label">Total commission</div>
          <div class="sub-value">{{ formatCurrency(userInfo?.totalCommission) }}</div>
        </div>
      </div>
    </section>

    <section class="info-box">
      <div class="info-title">
        Available orders
        <button class="refresh-btn" @click="fetchData" :disabled="loading || settingLoading || recordsLoading" title="Refresh">
          🔄
        </button>
      </div>
      <div class="info-value">
        <span v-if="settingLoading || recordsLoading">...</span>
        <span v-else>{{ availableOrders }}</span>
      </div>
    </section>

    <section class="info-box">
      <div class="info-title">Remaining order</div>
      <div class="info-value">
        <span v-if="settingLoading || recordsLoading">...</span>
        <span v-else>{{ remainingOrders }}</span>
      </div>
    </section>

    <section class="stars">
      <div 
        class="star-card" 
        v-for="n in 3" 
        :key="n"
        :class="{ rotating: starsRotating }"
      >
        <div class="star-shape">★</div>
      </div>
    </section>

    <button class="action-btn" :disabled="recordsLoading || settingLoading" @click="completeOneOrder">
      {{ recordsLoading ? 'Processing...' : 'Orders received' }}
    </button>

    <div v-if="loading" class="toast">Loading...</div>
    <div v-if="error" class="toast error">{{ error }}</div>

    <!-- 订单信息弹窗 -->
    <div v-if="showOrderModal && orderInfo" class="modal-overlay" @click="closeOrderModal">
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closeOrderModal">×</button>
        <div class="modal-header">
          <h3>Order Information</h3>
        </div>
        <div class="modal-body">
          <div class="product-image-container">
            <img :src="orderInfo.productImage" :alt="orderInfo.productName" class="product-image" />
          </div>
          <div class="product-info">
            <h4 class="product-name">{{ orderInfo.productName }}</h4>
            <p class="product-desc">{{ orderInfo.productInfo }}</p>
            <div class="order-details">
              <div class="detail-row">
                <span class="detail-label">Product Price:</span>
                <span class="detail-value price">{{ formatCurrency(orderInfo.price) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Commission:</span>
                <span class="detail-value commission">{{ formatCurrency(orderInfo.commission) }}</span>
              </div>
            </div>
            <div v-if="orderInfo.needsTopUp" class="top-up-warning">
              <p class="warning-text">
                Insufficient balance, need to top up {{ formatCurrency(orderInfo.topUpAmount || 0) }}
              </p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn" @click="closeOrderModal">
            {{ orderInfo.needsTopUp ? 'Submit' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pre-order {
  min-height: 100vh;
  background: #0f0f0f;
  color: #fff;
  padding: 16px;
  padding-bottom: 100px; /* 预留底部导航空间 */
  box-sizing: border-box;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #ff4757;
}

.pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cards {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 12px;
  margin-bottom: 12px;
}

.card {
  border-radius: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.balance-card {
  background: linear-gradient(135deg, #d2e4ff 0%, #b8d5ff 40%, #8bb7ff 100%);
  color: #0b1d3a;
  position: relative;
  overflow: hidden;
}

.balance-card::after {
  content: '';
  position: absolute;
  width: 160px;
  height: 160px;
  right: -40px;
  top: -60px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 60%);
  opacity: 0.7;
}

.card-label {
  font-size: 13px;
  color: inherit;
  margin-bottom: 6px;
}

.card-value {
  font-size: 26px;
  font-weight: 800;
}

.column-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: transparent;
  border: none;
  box-shadow: none;
}

.sub-card {
  border-radius: 14px;
  padding: 14px;
  color: #0b1d3a;
  font-weight: 700;
}

.sub-card.today {
  background: linear-gradient(135deg, #c7f5d9 0%, #b3f0cc 100%);
}

.sub-card.total {
  background: linear-gradient(135deg, #f4e3f7 0%, #e5c8ef 100%);
}

.sub-label {
  font-size: 12px;
  color: #2f3c50;
  margin-bottom: 6px;
  font-weight: 600;
}

.sub-value {
  font-size: 22px;
}

.info-box {
  background: #fff;
  color: #000;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.info-title {
  font-size: 13px;
  color: #5b5b5b;
  margin-bottom: 6px;
}

.info-value {
  font-size: 16px;
  font-weight: 700;
}

.info-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.refresh-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: transform 0.2s;
  opacity: 0.7;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 1;
  transform: rotate(180deg);
}

.refresh-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stars {
  background: #ef2f59;
  border-radius: 16px;
  padding: 16px 12px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 14px 0 16px;
}

.star-card {
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-shadow: inset 0 0 0 4px #ef2f59;
}

.star-shape {
  font-size: 72px;
  color: #ef2f59;
  line-height: 1;
  transition: transform 0.3s ease;
}

.star-card.rotating .star-shape {
  animation: rotate360 1s ease-in-out;
}

@keyframes rotate360 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 999px;
  background: #ef2f59;
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 8px 20px rgba(239, 47, 89, 0.35);
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
}

.action-btn:active {
  transform: translateY(1px);
  box-shadow: 0 4px 12px rgba(239, 47, 89, 0.25);
}

.toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  z-index: 1100;
}

.toast.error {
  background: rgba(255, 72, 72, 0.9);
}

@media (max-width: 520px) {
  /* 保持图1的布局，不改变为单列 */
  .cards {
    grid-template-columns: 1.1fr 0.9fr;
    gap: 8px; /* 缩小间距以适应小屏幕 */
  }

  .balance-card::after {
    width: 120px;
    height: 120px;
  }
  
  /* 调整卡片内字体大小以适应小屏幕 */
  .card-value {
    font-size: 22px;
  }
  
  .sub-value {
    font-size: 18px;
  }
  
  .card-label,
  .sub-label {
    font-size: 11px;
  }
}

/* 订单信息弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: #fff;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  z-index: 10;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #000;
}

.modal-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.product-image-container {
  width: 80%;
  max-width: 640px;
  margin: 0 auto 16px;
  border-radius: 12px;
  overflow: hidden;
  background: #f5f5f5;
  aspect-ratio: 1 / 0.67;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.product-info {
  text-align: left;
}

.product-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-desc {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.order-details {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 18px;
  font-weight: 800;
}

.detail-value.price {
  color: #ef2f59;
}

.detail-value.balance {
  color: #ef2f59;
}

.detail-value.commission {
  color: #4caf50;
}

.detail-value.injection {
  color: #f59e0b;
  font-weight: 700;
}

.top-up-warning {
  margin-top: 16px;
  padding: 12px;
  background: #fee2e2;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.warning-text {
  margin: 0;
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.modal-footer {
  padding: 16px 20px 20px;
  border-top: 1px solid #eee;
}

.modal-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #ef2f59;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn:hover {
  background: #d62850;
  transform: translateY(-1px);
}

.modal-btn:active {
  transform: translateY(0);
}
</style>
