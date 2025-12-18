import http from './http';

export interface RechargeRequest {
  id: number;
  userId: number;
  amount: number;
  status: string;
  note?: string | null;
  voucherImage?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    account: string;
    name?: string | null;
    inviteCode?: string | null;
    myInviteCode?: string | null;
  };
}

export const listRecharges = () => http.get<RechargeRequest[]>('/recharges');

export const updateRechargeStatus = (id: number, status: 'approved' | 'rejected', note?: string) =>
  http.put<RechargeRequest>(`/recharges/${id}/status`, { status, note });

export const getPendingCount = () => http.get<{ count: number }>('/recharges/pending/count');

