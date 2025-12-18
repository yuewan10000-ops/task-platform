import http from './http';

export interface WithdrawRequest {
  id: number;
  userId: number;
  amount: number;
  status: string;
  note?: string | null;
  walletAddress?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    account: string;
    name?: string | null;
    inviteCode?: string | null;
    myInviteCode?: string | null;
    walletAddress?: string | null;
  };
}

export const listWithdraws = () => http.get<WithdrawRequest[]>('/withdraws');

export const updateWithdrawStatus = (id: number, status: 'approved' | 'rejected', note?: string) =>
  http.put<WithdrawRequest>(`/withdraws/${id}/status`, { status, note });


