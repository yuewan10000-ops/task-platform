import { http } from './http';

export interface UserInfo {
  user: {
    id: number;
    account: string;
    balance: number;
    myInviteCode: string;
    walletAddress?: string | null;
  };
  todayCommission: number;
  totalCommission: number;
  difference?: number | null;
}

export const getUserInfo = (userId: number): Promise<UserInfo> => 
  http.get(`/user/me?userId=${userId}`) as Promise<UserInfo>;

// 更新用户余额
export const updateUserBalance = (userId: number, amount: number): Promise<{ id: number; balance: number }> => 
  http.put('/user/balance', { userId, amount });

// 更新钱包地址
export const updateWalletAddress = (userId: number, walletAddress: string): Promise<{ id: number; walletAddress: string | null }> =>
  http.put('/user/wallet', { userId, walletAddress });

// 修改登录密码
export const updateLoginPassword = (userId: number, oldPassword: string, newPassword: string): Promise<{ message: string }> =>
  http.put('/user/password/login', { userId, oldPassword, newPassword });

// 修改支付密码
export const updatePaymentPassword = (userId: number, oldPassword: string, newPassword: string): Promise<{ message: string }> =>
  http.put('/user/password/payment', { userId, oldPassword, newPassword });

