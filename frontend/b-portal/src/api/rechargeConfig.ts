import http from './http';

export interface RechargeConfig {
  id: number;
  trc20Address: string | null;
  trxAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getRechargeConfig = () => http.get<RechargeConfig>('/recharge-config');

export const updateRechargeConfig = (payload: {
  trc20Address?: string;
  trxAddress?: string;
}) => http.put<RechargeConfig>('/recharge-config', payload);

