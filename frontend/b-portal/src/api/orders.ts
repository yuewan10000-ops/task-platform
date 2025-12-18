import http from './http';

export interface CreateOrderRecordPayload {
  userId: number;
  orderType: string;
  amount: number;
  status?: string;
  description?: string;
}

export const createOrderRecord = (payload: CreateOrderRecordPayload) => {
  return http.post('/orders/records', {
    ...payload,
    status: payload.status || 'completed',
  });
};

