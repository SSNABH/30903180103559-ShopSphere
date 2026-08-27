import { http, HttpResponse } from 'msw';

export const sampleProduct = {
  id: 'product-1',
  name: 'DECI Nova Laptop',
  slug: 'deci-nova-laptop',
  description: 'A balanced laptop for study, work, and creative projects.',
  price: 24999,
  stock: 7,
  brand: 'DECI',
  isFeatured: true,
  category: { id: 'category-1', name: 'Laptops', slug: 'laptops' },
  images: [{ id: 'image-1', url: '/uploads/nova-laptop.svg', altText: 'DECI Nova Laptop' }],
};

export const handlers = [
  http.get('http://localhost:5000/api/categories', () => HttpResponse.json({
    success: true,
    data: { categories: [{ id: 'category-1', name: 'Laptops', slug: 'laptops' }] },
  })),
  http.get('http://localhost:5000/api/products', () => HttpResponse.json({
    success: true,
    data: { items: [sampleProduct], total: 1, page: 1, limit: 8, pages: 1 },
  })),
];
