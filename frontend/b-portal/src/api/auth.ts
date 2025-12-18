import http from './http';

export interface LoginParams {
  account: string;
  password: string;
  captcha?: string;
  sessionId?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    account: string;
  };
}

export interface CaptchaResponse {
  sessionId: string;
  code: string;
}

export const login = async (params: LoginParams): Promise<LoginResponse> => {
  // 后台登录走 admin-login，避免前台用户共用
  return http.post('/auth/admin-login', params);
};

export const getCaptcha = async (): Promise<CaptchaResponse> => {
  return http.get('/captcha/captcha');
};

