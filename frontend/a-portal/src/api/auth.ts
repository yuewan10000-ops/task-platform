import { http } from './http';

export interface LoginPayload {
  account: string; // 手机账号
  password: string; // 登录密码
}

export interface RegisterPayload {
  account: string;
  loginPassword: string;
  payPassword: string;
  inviteCode: string;
}

export const login = (data: LoginPayload): Promise<any> => http.post('/auth/login', data) as any;

export const register = (data: RegisterPayload): Promise<any> => http.post('/auth/register', data) as any;

export const logout = (userId: number): Promise<any> => http.post('/auth/logout', { userId }) as any;

