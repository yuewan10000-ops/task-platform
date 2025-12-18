import http from './http';

export interface ProductPriceConfig {
  id: number;
  minRate: number; // 最小价格比例（0.29表示29%）
  maxRate: number; // 最大价格比例（0.60表示60%）
  createdAt: string;
  updatedAt: string;
}

export const getProductPriceConfig = (): Promise<ProductPriceConfig> =>
  http.get('/product-price-config');

export const updateProductPriceConfig = (payload: {
  minRate: number; // 0.01-1之间，如0.29表示29%
  maxRate: number; // 0.01-1之间，如0.60表示60%
}): Promise<ProductPriceConfig> =>
  http.put('/product-price-config', payload);

