import { http } from './http';

export interface CommissionRate {
  id: number;
  rate: number;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getActiveCommissionRate = (): Promise<CommissionRate> =>
  http.get('/commission-rate/active') as Promise<CommissionRate>;

