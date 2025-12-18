import { http } from './http';

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getActiveProducts = (): Promise<Product[]> =>
  http.get('/products/active') as Promise<Product[]>;

