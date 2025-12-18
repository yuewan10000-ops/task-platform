import { http } from './http';

export interface OrderSetting {
  id: number;
  userId: number;
  orderType: string;
  amount: number;
  status: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  maxOrders: number;
  commissionRate: number;
}

export interface OrderRecord {
  id: number;
  userId: number;
  orderType: string;
  amount: number;
  status: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getOrderSetting = (userId: number): Promise<OrderSetting | null> =>
  http.get(`/orders/settings/${userId}`);

export const getOrderRecords = (userId: number): Promise<OrderRecord[]> =>
  http.get(`/orders/records/${userId}`);

export const createOrderRecord = (payload: {
  userId: number;
  orderType: string;
  amount: number;
  status?: string;
  description?: string;
  commission?: number;
}) => {
  return http.post('/orders/records', {
    ...payload,
    status: payload.status || 'completed',
  });
};

