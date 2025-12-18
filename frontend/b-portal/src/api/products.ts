import http from './http';

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
  http.get('/products/active');

export const getProducts = (): Promise<Product[]> =>
  http.get('/products');

export const createProduct = (payload: {
  name: string;
  description?: string;
  image?: string | null;
  isActive?: boolean;
}): Promise<Product> =>
  http.post('/products', payload);

export const updateProduct = (
  id: number,
  payload: {
    name?: string;
    description?: string;
    image?: string | null;
    isActive?: boolean;
  }
): Promise<Product> =>
  http.put(`/products/${id}`, payload);

export const deleteProduct = (id: number): Promise<{ message: string }> =>
  http.delete(`/products/${id}`);

export const bulkCreateProducts = (payload: {
  products: Array<{
    name: string;
    description?: string;
    image?: string | null;
    isActive?: boolean;
  }>;
}): Promise<{ message: string; products: Product[] }> =>
  http.post('/products/bulk', payload);

