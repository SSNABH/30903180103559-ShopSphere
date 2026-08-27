import fs from 'node:fs/promises';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { hashPassword } from '../../../src/auth/password.js';
import { errorHandler } from '../../../src/middlewares/errorHandler.js';
import { notFound } from '../../../src/middlewares/notFound.js';
import { createAuthRouter } from '../../../src/routes/authRoutes.js';
import { createCartRouter } from '../../../src/routes/cartRoutes.js';
import { createOrderRouter } from '../../../src/routes/orderRoutes.js';
import { createProductRouter } from '../../../src/routes/productRoutes.js';
import { createAuthService } from '../../../src/services/authService.js';
import { createCartService } from '../../../src/services/cartService.js';
import { createOrderService } from '../../../src/services/orderService.js';
import { createProductService } from '../../../src/services/productService.js';
import { createMemoryCommerce } from '../../helpers/memoryCommerce.js';

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const shippingAddress = {
  fullName: 'Mona Hassan',
  phone: '01000000000',
  addressLine: '10 Nile Street',
  city: 'Cairo',
  governorate: 'Cairo',
  postalCode: '11511',
};

async function createFixture() {
  const now = new Date();
  const memory = createMemoryCommerce({
    users: [
      {
        id: 'customer-1', name: 'Customer', email: 'customer@example.com',
        passwordHash: await hashPassword('Customer1A'), role: 'CUSTOMER',
        isActive: true, phone: null, address: null, createdAt: now, updatedAt: now,
      },
      {
        id: 'admin-1', name: 'Admin', email: 'admin@example.com',
        passwordHash: await hashPassword('AdminPass1'), role: 'ADMIN',
        isActive: true, phone: null, address: null, createdAt: now, updatedAt: now,
      },
    ],
  });

  memory.state.categories.push({
    id: 'category-1', name: 'Laptops', slug: 'laptops', description: 'Portable computers',
    createdAt: now, updatedAt: now,
  });
  memory.state.products.push({
    id: 'product-1', name: 'DECI Nova Laptop', slug: 'deci-nova-laptop', sku: 'DECI-NOVA-1',
    description: 'A balanced laptop for study and work.', price: 10000, stock: 3, brand: 'DECI',
    isFeatured: true, isActive: true, categoryId: 'category-1', createdAt: now, updatedAt: now,
  });

  const activityLogService = { record: async () => null };
  const emailService = { sendWelcomeEmail: async () => ({ messageId: 'commerce-test' }) };
  const authService = createAuthService(memory.userRepository, { emailService, activityLogService });
  const productService = createProductService(memory.productRepository, memory.categoryRepository, activityLogService);
  const cartService = createCartService(memory.cartRepository, memory.productRepository);
  const orderService = createOrderService(memory.orderRepository);
  const reviewService = {
    list: async () => ({ items: [], total: 0, page: 1, limit: 10, pages: 0, summary: { averageRating: 0, reviewCount: 0 } }),
  };

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', createAuthRouter({ authService, userRepository: memory.userRepository }));
  app.use('/api/products', createProductRouter({ productService, reviewService, userRepository: memory.userRepository }));
  app.use('/api/cart', createCartRouter({ cartService, userRepository: memory.userRepository }));
  app.use('/api/orders', createOrderRouter({ orderService, userRepository: memory.userRepository }));
  app.use(notFound);
  app.use(errorHandler);

  async function login(email, password) {
    const response = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
    return response.body.data.accessToken;
  }

  return { app, memory, login };
}

describe('commerce APIs through Supertest', () => {
  test('lists, searches, filters, and protects product mutations by role', async () => {
    const { app, login } = await createFixture();
    const customerToken = await login('customer@example.com', 'Customer1A');
    const adminToken = await login('admin@example.com', 'AdminPass1');

    await request(app)
      .get('/api/products?q=nova&category=laptops&featured=true&sort=price-asc&page=1&limit=8')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.total).toBe(1);
        expect(body.data.items[0]).toMatchObject({ id: 'product-1', sku: 'DECI-NOVA-1' });
      });

    const newProduct = {
      name: 'DECI Studio Monitor', sku: 'DECI-MONITOR-1',
      description: 'A detailed monitor for focused creative work.',
      price: 8000, stock: 5, brand: 'DECI', categoryId: 'category-1', isFeatured: false,
    };

    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(newProduct)
      .expect(403);

    const created = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newProduct)
      .expect(201);

    const productId = created.body.data.product.id;
    await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 7500, stock: 6 })
      .expect(200)
      .expect(({ body }) => expect(body.data.product).toMatchObject({ price: 7500, stock: 6 }));

    await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app).get(`/api/products/${productId}`).expect(404);
  });


  test('uploads multipart product images for Admin users and rejects invalid files', async () => {
    const { app, login } = await createFixture();
    const customerToken = await login('customer@example.com', 'Customer1A');
    const adminToken = await login('admin@example.com', 'AdminPass1');

    await request(app)
      .post('/api/products/product-1/images')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('images', pngSignature, { filename: 'product.png', contentType: 'image/png' })
      .expect(403);

    const uploaded = await request(app)
      .post('/api/products/product-1/images')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('images', pngSignature, { filename: 'product.png', contentType: 'image/png' })
      .expect(201);

    const image = uploaded.body.data.product.images.at(-1);
    expect(image.url).toMatch(/^\/uploads\/products\//);
    await fs.unlink(path.resolve(image.url.replace(/^\//, ''))).catch(() => {});

    await request(app)
      .post('/api/products/product-1/images')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('images', Buffer.from('plain-text'), { filename: 'notes.txt', contentType: 'text/plain' })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('INVALID_IMAGE_TYPE'));

    await request(app)
      .post('/api/products/product-1/images')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('images', Buffer.from('not-a-real-png'), { filename: 'spoofed.png', contentType: 'image/png' })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('INVALID_IMAGE_CONTENT'));

    const uploadDirectory = path.resolve('uploads/products');
    const filesBeforeLimitError = await fs.readdir(uploadDirectory);
    let tooManyImages = request(app)
      .post('/api/products/product-1/images')
      .set('Authorization', `Bearer ${adminToken}`);
    for (let index = 0; index < 6; index += 1) {
      tooManyImages = tooManyImages.attach('images', pngSignature, { filename: `product-${index}.png`, contentType: 'image/png' });
    }
    await tooManyImages
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('IMAGE_UPLOAD_ERROR'));
    expect(await fs.readdir(uploadDirectory)).toEqual(filesBeforeLimitError);
  });

  test('requires authentication and validates cart quantities and totals', async () => {
    const { app, login } = await createFixture();
    const customerToken = await login('customer@example.com', 'Customer1A');

    await request(app).post('/api/cart/items').send({ productId: 'product-1', quantity: 1 }).expect(401);

    const added = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'product-1', quantity: 1 })
      .expect(201);

    expect(added.body.data.cart).toMatchObject({ itemCount: 1, subtotal: 10000, total: 10000 });
    const itemId = added.body.data.cart.items[0].id;

    await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 2 })
      .expect(200)
      .expect(({ body }) => expect(body.data.cart).toMatchObject({ itemCount: 2, total: 20000 }));

    await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ quantity: 4 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('INSUFFICIENT_STOCK'));

    await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.cart.items).toHaveLength(0));
  });

  test('checks out atomically, reduces inventory, and clears the cart', async () => {
    const { app, memory, login } = await createFixture();
    const customerToken = await login('customer@example.com', 'Customer1A');

    await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shippingAddress })
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('CART_EMPTY'));

    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: 'product-1', quantity: 2 })
      .expect(201);

    const checkout = await request(app)
      .post('/api/orders/checkout')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ shippingAddress })
      .expect(201);

    expect(checkout.body.data.order).toMatchObject({ subtotal: 20000, total: 20000 });
    expect(memory.state.products.find((product) => product.id === 'product-1').stock).toBe(1);
    expect(memory.state.orders).toHaveLength(1);

    await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.cart.items).toHaveLength(0));
  });
});
