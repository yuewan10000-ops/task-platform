import { http } from './http';

export interface InjectionPlan {
  id: number;
  userId: number;
  orderSettingId?: number | null; // 在第几个订单添加（如30表示第30个订单）
  commissionRate: number; // 订单佣金
  injectionAmount: number; // 打针金额（订单价格需要比用户余额高出的金额）
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getInjectionPlans = (userId: number): Promise<InjectionPlan[]> => {
  console.log('[API] getInjectionPlans called with userId:', userId);
  return http.get(`/injection-plans/user/${userId}`).then((data: any) => {
    console.log('[API] getInjectionPlans response:', data);
    return data;
  }).catch((error: any) => {
    console.error('[API] getInjectionPlans error:', error);
    throw error;
  });
};

