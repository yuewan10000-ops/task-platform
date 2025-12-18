import { http } from './http';

export interface RechargeConfig {
  id: number;
  trc20Address: string | null;
  trxAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getRechargeConfig = () =>
  http.get<RechargeConfig>('/recharge-config') as unknown as Promise<RechargeConfig>;

export const createRechargeRequest = (payload: { userId: number; amount: number; voucherImage?: string }) =>
  http.post('/recharges', payload);

export interface RechargeRecord {
  id: number;
  amount: number;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getUserRechargeRecords = (userId: number): Promise<RechargeRecord[]> =>
  http.get(`/recharges/user/${userId}`) as Promise<RechargeRecord[]>;

