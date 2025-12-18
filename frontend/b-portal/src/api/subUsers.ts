import http from './http';

export interface SubUser {
  id: number;
  account: string;
  myInviteCode: string | null; // 子用户的邀请码
  parentAdminId: number | null;
  parentAdmin?: {
    id: number;
    account: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isOnline: boolean;
}

export interface CreateSubUserParams {
  account: string;
  loginPassword: string;
  payPassword: string;
}

export interface UpdateSubUserParams {
  account?: string;
  loginPassword?: string;
  payPassword?: string;
}

export const getSubUserList = (): Promise<SubUser[]> => {
  return http.get('/sub-users');
};

export const createSubUser = (params: CreateSubUserParams): Promise<SubUser> => {
  return http.post('/sub-users', params);
};

export const updateSubUser = (id: number, params: UpdateSubUserParams): Promise<SubUser> => {
  return http.put(`/sub-users/${id}`, params);
};

export const deleteSubUser = (id: number): Promise<{ message: string }> => {
  return http.delete(`/sub-users/${id}`);
};

// 为现有子用户生成邀请码
export const generateInviteCodes = (): Promise<{ message: string; results: any[] }> => {
  return http.post('/sub-users/generate-invite-codes');
};

