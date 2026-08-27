import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://deci:test@localhost:5432/deci_test?schema=public';
process.env.MONGODB_URI = 'mongodb://localhost:27017/deci_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_456';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_CONNECTION_REQUIRED = 'false';

const [{ createApp }, { issueTokenPair }, { createMemoryCommerce }] = await Promise.all([
  import('../src/app.js'),
  import('../src/auth/jwt.js'),
  import('./helpers/memoryCommerce.js'),
]);

function user(id, role) {
  const timestamp = new Date('2026-07-20T10:00:00.000Z');
  return { id, name: role, email: `${role.toLowerCase()}@example.com`, passwordHash: 'unused', role, isActive: true, phone: null, address: null, createdAt: timestamp, updatedAt: timestamp };
}

async function request(baseUrl, pathname, { method = 'GET', token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}/api${pathname}`, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
  const payload = await response.json();
  return { response, payload };
}

test('commerce APIs satisfy CRUD, discovery, image, cart, and checkout requirements', async (t) => {
  const admin = user('admin-1', 'ADMIN');
  const customer = user('customer-1', 'CUSTOMER');
  const memory = createMemoryCommerce({ users: [admin, customer] });
  const app = createApp(memory);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const adminToken = issueTokenPair(admin).accessToken;
  const customerToken = issueTokenPair(customer).accessToken;

  const categoryResponse = await request(baseUrl, '/categories', {
    method: 'POST', token: adminToken, body: { name: 'Smartphones', description: 'Mobile electronics' },
  });
  assert.equal(categoryResponse.response.status, 201);
  assert.equal(categoryResponse.payload.data.category.slug, 'smartphones');
  const categoryId = categoryResponse.payload.data.category.id;

  const forbidden = await request(baseUrl, '/products', {
    method: 'POST', token: customerToken,
    body: { name: 'Forbidden Phone', sku: 'FORBIDDEN', description: 'A product a customer cannot create.', price: 1000, stock: 1, categoryId },
  });
  assert.equal(forbidden.response.status, 403);

  const first = await request(baseUrl, '/products', {
    method: 'POST', token: adminToken,
    body: { name: 'DECI Nova Phone', sku: 'PHONE-001', description: 'A flagship smartphone with a bright OLED display.', price: 24999, stock: 8, brand: 'DECI', isFeatured: true, categoryId },
  });
  assert.equal(first.response.status, 201);
  const productId = first.payload.data.product.id;

  const second = await request(baseUrl, '/products', {
    method: 'POST', token: adminToken,
    body: { name: 'Budget Phone', sku: 'PHONE-002', description: 'An affordable smartphone for everyday communication.', price: 6999, stock: 20, brand: 'ValueTech', categoryId },
  });
  assert.equal(second.response.status, 201);

  const form = new FormData();
  form.append('images', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'phone.png');
  const uploaded = await request(baseUrl, `/products/${productId}/images`, { method: 'POST', token: adminToken, form });
  assert.equal(uploaded.response.status, 201);
  assert.equal(uploaded.payload.data.product.images.length, 1);
  assert.match(uploaded.payload.data.product.images[0].url, /^\/uploads\/products\//);
  t.after(async () => {
    const relative = uploaded.payload.data.product.images[0].url.replace('/uploads/', '');
    await fs.unlink(path.resolve('uploads', relative)).catch(() => {});
  });

  const discovery = await request(baseUrl, '/products?q=phone&category=smartphones&sort=price-desc&page=1&limit=1');
  assert.equal(discovery.response.status, 200);
  assert.equal(discovery.payload.data.total, 2);
  assert.equal(discovery.payload.data.pages, 2);
  assert.equal(discovery.payload.data.items[0].name, 'DECI Nova Phone');

  const details = await request(baseUrl, `/products/${first.payload.data.product.slug}`);
  assert.equal(details.response.status, 200);
  assert.equal(details.payload.data.product.category.name, 'Smartphones');
  assert.equal(details.payload.data.product.images.length, 1);

  const added = await request(baseUrl, '/cart/items', { method: 'POST', token: customerToken, body: { productId, quantity: 2 } });
  assert.equal(added.response.status, 201);
  assert.equal(added.payload.data.cart.itemCount, 2);
  assert.equal(added.payload.data.cart.total, 49998);
  const itemId = added.payload.data.cart.items[0].id;

  const updatedCart = await request(baseUrl, `/cart/items/${itemId}`, { method: 'PATCH', token: customerToken, body: { quantity: 3 } });
  assert.equal(updatedCart.payload.data.cart.total, 74997);

  const removed = await request(baseUrl, `/cart/items/${itemId}`, { method: 'DELETE', token: customerToken });
  assert.equal(removed.payload.data.cart.itemCount, 0);
  await request(baseUrl, '/cart/items', { method: 'POST', token: customerToken, body: { productId, quantity: 2 } });

  const checkout = await request(baseUrl, '/orders/checkout', {
    method: 'POST', token: customerToken,
    body: { shippingAddress: { fullName: 'DECI Customer', phone: '01000000000', addressLine: '1 Technology Street', city: 'Cairo', governorate: 'Cairo', postalCode: '11511' } },
  });
  assert.equal(checkout.response.status, 201);
  assert.equal(checkout.payload.data.order.total, 49998);
  assert.equal(checkout.payload.data.order.status, 'PENDING');

  const emptyCart = await request(baseUrl, '/cart', { token: customerToken });
  assert.equal(emptyCart.payload.data.cart.itemCount, 0);

  const updatedProduct = await request(baseUrl, `/products/${productId}`, { method: 'PATCH', token: adminToken, body: { price: 23999, stock: 6 } });
  assert.equal(updatedProduct.response.status, 200);
  assert.equal(updatedProduct.payload.data.product.price, 23999);

  const deletedProduct = await request(baseUrl, `/products/${productId}`, { method: 'DELETE', token: adminToken });
  assert.equal(deletedProduct.response.status, 200);
  const missing = await request(baseUrl, `/products/${productId}`);
  assert.equal(missing.response.status, 404);

  await request(baseUrl, `/products/${second.payload.data.product.id}`, { method: 'DELETE', token: adminToken });
  const deletedCategory = await request(baseUrl, `/categories/${categoryId}`, { method: 'DELETE', token: adminToken });
  assert.equal(deletedCategory.response.status, 200);
});

test('commerce validation rejects invalid ranges, stock requests, and image types', async (t) => {
  const admin = user('admin-2', 'ADMIN');
  const customer = user('customer-2', 'CUSTOMER');
  const memory = createMemoryCommerce({ users: [admin, customer] });
  const app = createApp(memory);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const adminToken = issueTokenPair(admin).accessToken;
  const customerToken = issueTokenPair(customer).accessToken;

  const invalidRange = await request(baseUrl, '/products?minPrice=500&maxPrice=100');
  assert.equal(invalidRange.response.status, 400);

  const category = await request(baseUrl, '/categories', { method: 'POST', token: adminToken, body: { name: 'Audio' } });
  const product = await request(baseUrl, '/products', {
    method: 'POST', token: adminToken,
    body: { name: 'Wireless Headphones', sku: 'AUDIO-001', description: 'Comfortable wireless headphones with active noise cancellation.', price: 3999, stock: 1, categoryId: category.payload.data.category.id },
  });
  const tooMany = await request(baseUrl, '/cart/items', { method: 'POST', token: customerToken, body: { productId: product.payload.data.product.id, quantity: 2 } });
  assert.equal(tooMany.response.status, 409);
  assert.equal(tooMany.payload.code, 'INSUFFICIENT_STOCK');

  const form = new FormData();
  form.append('images', new Blob(['not-an-image'], { type: 'text/plain' }), 'notes.txt');
  const invalidImage = await request(baseUrl, `/products/${product.payload.data.product.id}/images`, { method: 'POST', token: adminToken, form });
  assert.equal(invalidImage.response.status, 400);
  assert.equal(invalidImage.payload.code, 'INVALID_IMAGE_TYPE');

  const spoofedImage = new FormData();
  spoofedImage.append('images', new Blob(['not-a-real-png'], { type: 'image/png' }), 'spoofed.png');
  const invalidContent = await request(baseUrl, `/products/${product.payload.data.product.id}/images`, { method: 'POST', token: adminToken, form: spoofedImage });
  assert.equal(invalidContent.response.status, 400);
  assert.equal(invalidContent.payload.code, 'INVALID_IMAGE_CONTENT');
});
