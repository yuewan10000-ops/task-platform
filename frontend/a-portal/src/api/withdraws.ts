import { http } from './http';

export interface CreateWithdrawPayload {
  userId: number;
  amount: number;
  walletAddress?: string;
  payPassword: string;
}

export const createWithdrawRequest = (payload: CreateWithdrawPayload) =>
  http.post('/withdraws', payload);

export interface WithdrawRecord {
  id: number;
  amount: number;
  status: string;
  note: string | null;
  walletAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getUserWithdrawRecords = (userId: number): Promise<WithdrawRecord[]> =>
  http.get(`/withdraws/user/${userId}`) as Promise<WithdrawRecord[]>;


