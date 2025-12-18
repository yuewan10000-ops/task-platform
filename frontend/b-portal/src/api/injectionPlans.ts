import http from './http';

export interface InjectionPlan {
  id: number;
  userId: number;
  orderSettingId?: number | null;
  commissionRate: number; // 订单佣金
  injectionAmount: number; // 打针全额
  isActive: boolean;
  status?: 'completed' | 'pending' | null; // 打针状态（后端计算）
  createdAt: string;
  updatedAt: string;
}

export const getInjectionPlans = (userId: number): Promise<InjectionPlan[]> =>
  http.get(`/injection-plans/user/${userId}`);

export const createInjectionPlan = (payload: {
  userId: number;
  orderSettingId?: number;
  commissionRate: number;
  injectionAmount: number;
  isActive?: boolean;
}): Promise<InjectionPlan> =>
  http.post('/injection-plans', payload);

export const updateInjectionPlan = (
  id: number,
  payload: {
    orderSettingId?: number;
    commissionRate?: number;
    injectionAmount?: number;
    isActive?: boolean;
  }
): Promise<InjectionPlan> =>
  http.put(`/injection-plans/${id}`, payload);

export const deleteInjectionPlan = (id: number): Promise<{ message: string }> =>
  http.delete(`/injection-plans/${id}`);

