import http from './http';

export interface CommissionRate {
  id: number;
  rate: number;
  isActive: boolean;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getActiveCommissionRate = (): Promise<CommissionRate> =>
  http.get('/commission-rate/active');

export const getCommissionRates = (): Promise<CommissionRate[]> =>
  http.get('/commission-rate');

export const createCommissionRate = (payload: {
  rate: number;
  isActive?: boolean;
  description?: string;
}): Promise<CommissionRate> =>
  http.post('/commission-rate', payload);

export const updateCommissionRate = (
  id: number,
  payload: {
    rate?: number;
    isActive?: boolean;
    description?: string;
  }
): Promise<CommissionRate> =>
  http.put(`/commission-rate/${id}`, payload);

export const deleteCommissionRate = (id: number): Promise<{ message: string }> =>
  http.delete(`/commission-rate/${id}`);

