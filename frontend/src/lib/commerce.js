import { api, reviewApi } from './api.js';

export const apiOrigin = (api.defaults.baseURL ?? 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export function imageUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${apiOrigin}${url}`;
}

export const commerceApi = {
  categories: () => api.get('/categories').then((response) => response.data.data.categories),
  products: (params) => api.get('/products', { params }).then((response) => response.data.data),
  product: (identifier) => api.get(`/products/${identifier}`).then((response) => response.data.data.product),
  // Served by the review service. The paths are unchanged; only the origin moved.
  reviews: (identifier, params = {}) => reviewApi.get(`/products/${identifier}/reviews`, { params }).then((response) => response.data.data),
  createReview: ({ identifier, data }) => reviewApi.post(`/products/${identifier}/reviews`, data).then((response) => response.data.data.review),
  updateReview: ({ identifier, reviewId, data }) => reviewApi.patch(`/products/${identifier}/reviews/${reviewId}`, data).then((response) => response.data.data.review),
  deleteReview: ({ identifier, reviewId }) => reviewApi.delete(`/products/${identifier}/reviews/${reviewId}`).then((response) => response.data.data.review),
  createCategory: (data) => api.post('/categories', data).then((response) => response.data.data.category),
  updateCategory: ({ id, data }) => api.patch(`/categories/${id}`, data).then((response) => response.data.data.category),
  deleteCategory: (id) => api.delete(`/categories/${id}`).then((response) => response.data.data.category),
  createProduct: (data) => api.post('/products', data).then((response) => response.data.data.product),
  updateProduct: ({ id, data }) => api.patch(`/products/${id}`, data).then((response) => response.data.data.product),
  deleteProduct: (id) => api.delete(`/products/${id}`).then((response) => response.data.data.product),
  uploadImages: ({ id, files }) => {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    return api.post(`/products/${id}/images`, form).then((response) => response.data.data.product);
  },
  deleteImage: ({ productId, imageId }) => api.delete(`/products/${productId}/images/${imageId}`).then((response) => response.data.data.image),
  cart: () => api.get('/cart').then((response) => response.data.data.cart),
  addCart: (data) => api.post('/cart/items', data).then((response) => response.data.data.cart),
  updateCart: ({ itemId, quantity }) => api.patch(`/cart/items/${itemId}`, { quantity }).then((response) => response.data.data.cart),
  removeCart: (itemId) => api.delete(`/cart/items/${itemId}`).then((response) => response.data.data.cart),
  checkout: (shippingAddress) => api.post('/orders/checkout', { shippingAddress }).then((response) => response.data.data.order),
  orders: (params = {}) => api.get('/orders/mine', { params }).then((response) => response.data.data),
  order: (id) => api.get(`/orders/${id}`).then((response) => response.data.data.order),
  adminUsers: (params = {}) => api.get('/users', { params }).then((response) => response.data.data),
  statistics: () => api.get('/statistics/overview').then((response) => response.data.data.statistics),
  activityLogs: (params = {}) => api.get('/activity-logs', { params }).then((response) => response.data.data),
};
