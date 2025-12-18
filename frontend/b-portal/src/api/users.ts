import http from './http';

export interface User {
  id: number;
  account: string | null;
  email: string | null;
  name: string | null;
  inviteCode: string | null;      // 注册时使用的邀请码（上级的邀请码）
  myInviteCode: string | null;    // 用户自己的邀请码
  parentId: number | null;        // 上级用户ID
  parent: {                        // 上级用户信息
    id: number;
    account: string | null;
    name: string | null;           // 上级用户名
    myInviteCode: string | null;
  } | null;
  orderSetting: {
    maxOrders: number;
    commissionRate: number;
  } | null;
  orderStats: {
    total: number;        // 全部订单数（单次开启数量）
    cumulative: number;   // 累计订单数（所有开启记录 maxOrders 之和）
    completed: number;    // 完成订单数（A端完成的订单数）
    pending: number;      // 未完成订单数（全部订单数 - 完成订单数）
    totalCommission: number; // 总佣金金额（所有完成订单的佣金总和）
  };
  balance: number | null;         // 账户余额
  totalRecharged?: number;        // 已充值总额（用于计算差额时排除）
  difference: number | null;      // 打针订单差额（用户需要补充的金额）
  walletAddress: string | null;   // 钱包地址
  remark: string | null;          // 备注（仅B端使用）
  isOnline: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const getUserList = async (): Promise<User[]> => {
  return http.get('/users');
};

export const getUserById = async (id: number): Promise<User> => {
  return http.get(`/users/${id}`);
};

export interface UserTeam {
  user: {
    id: number;
    account: string | null;
    name: string | null;
    myInviteCode: string | null;
    parentId: number | null;
  };
  parent: {
    id: number;
    account: string | null;
    name: string | null;
    myInviteCode: string | null;
  } | null;
  children: Array<{
    id: number;
    account: string | null;
    name: string | null;
    myInviteCode: string | null;
  }>;
}

export const getUserTeam = async (id: number): Promise<UserTeam> => {
  return http.get(`/users/${id}/team`);
};

// 更新用户备注
export const updateUserRemark = async (id: number, remark: string | null): Promise<{ id: number; remark: string | null }> => {
  return http.put(`/users/${id}/remark`, { remark });
};

// 更新用户余额（正数加，负数减）
export const updateUserBalance = async (userId: number, amount: number): Promise<{ id: number; balance: number }> => {
  return http.put('/user/balance', { userId, amount });
};

// 更新用户密码（登录/支付，任填其一）
export const updateUserPassword = async (
  userId: number,
  payload: { loginPassword?: string; payPassword?: string },
): Promise<{ id: number }> => {
  return http.put(`/users/${userId}/password`, payload);
};

// 删除用户
export const deleteUser = async (userId: number): Promise<{ message: string }> => {
  return http.delete(`/users/${userId}`);
};

// 将会员分配给子用户管理
export const assignUserToSubUser = async (userId: number, subUserId: number | null): Promise<{ id: number; managedBySubUserId: number | null }> => {
  return http.put(`/users/${userId}/assign-sub-user`, { subUserId });
};

