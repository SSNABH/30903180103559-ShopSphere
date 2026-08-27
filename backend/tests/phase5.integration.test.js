import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://deci:test@localhost:5432/deci_test?schema=public';
process.env.MONGODB_URI = 'mongodb://localhost:27017/deci_test';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_that_is_long_enough_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_that_is_long_enough_456';
process.env.DATABASE_CONNECTION_REQUIRED = 'false';

const [{ createApp }, { issueTokenPair }, { createMemoryCommerce }, { createActivityLogService }] = await Promise.all([
  import('../src/app.js'),
  import('../src/auth/jwt.js'),
  import('./helpers/memoryCommerce.js'),
  import('../src/services/activityLogService.js'),
]);

function user(id, role, email = `${role.toLowerCase()}@example.com`) {
  const timestamp = new Date('2026-07-20T10:00:00.000Z');
  return { id, name: role === 'ADMIN' ? 'Admin User' : 'Customer User', email, passwordHash: 'unused', role, isActive: true, phone: null, address: null, createdAt: timestamp, updatedAt: timestamp };
}

function createMemoryReviewRepository() {
  const reviews = [];
  return {
    async listByProduct(productId, { page, limit }) {
      const all = reviews.filter((review) => review.productId === productId);
      const averageRating = all.length ? all.reduce((sum, review) => sum + review.rating, 0) / all.length : 0;
      return { items: structuredClone(all), total: all.length, page, limit, pages: Math.ceil(all.length / limit), summary: { averageRating, reviewCount: all.length } };
    },
    async findById(id) { return structuredClone(reviews.find((review) => review.id === id)); },
    async findByProductAndUser(productId, userId) { return structuredClone(reviews.find((review) => review.productId === productId && review.userId === userId)); },
    async create(data) { const review = { id: new mongoose.Types.ObjectId().toString(), ...data, createdAt: new Date(), updatedAt: new Date() }; reviews.push(review); return structuredClone(review); },
    async update(id, data) { const index = reviews.findIndex((review) => review.id === id); reviews[index] = { ...reviews[index], ...data, updatedAt: new Date() }; return structuredClone(reviews[index]); },
    async delete(id) { const index = reviews.findIndex((review) => review.id === id); return structuredClone(reviews.splice(index, 1)[0]); },
    async countAll() { return reviews.length; },
  };
}

function createMemoryActivityRepository() {
  const logs = [];
  return {
    async create(data) { const log = { id: `log-${logs.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date() }; logs.push(log); return structuredClone(log); },
    async list({ page, limit, action, entityType }) {
      const all = logs.filter((log) => (!action || log.action === action) && (!entityType || log.entityType === entityType)).reverse();
      return { items: structuredClone(all.slice((page - 1) * limit, page * limit)), total: all.length, page, limit, pages: Math.ceil(all.length / limit) };
    },
    async countAll() { return logs.length; },
  };
}

async function request(baseUrl, pathname, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}/api${pathname}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, payload: await response.json() };
}

test('Phase 5 services deliver email, reviews, logs, and Admin statistics', async (t) => {
  const admin = user('admin-5', 'ADMIN');
  const customer = user('customer-5', 'CUSTOMER');
  const memory = createMemoryCommerce({ users: [admin, customer] });
  const reviewRepository = createMemoryReviewRepository();
  const activityLogService = createActivityLogService(createMemoryActivityRepository());
  const sentEmails = [];
  const emailService = { async sendWelcomeEmail(recipient) { sentEmails.push(recipient.email); return { messageId: 'mail-1' }; } };
  const statisticsRepository = {
    async overview() {
      return {
        totalUsers: 3, totalProducts: 1, totalCategories: 1, totalOrders: 1, totalRevenue: 24999,
        averageOrderValue: 24999, lowStockProducts: 0, activeProducts: 1,
        recentOrders: [], orderStatus: [{ status: 'PENDING', _count: { _all: 1 } }],
        topProducts: [{ productName: 'DECI Nova', productSku: 'NOVA-5', _sum: { quantity: 2, lineTotal: 49998 } }],
      };
    },
  };
  const app = createApp({ ...memory, reviewRepository, activityLogService, emailService, statisticsRepository });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const adminToken = issueTokenPair(admin).accessToken;
  const customerToken = issueTokenPair(customer).accessToken;

  const registered = await request(baseUrl, '/auth/register', { method: 'POST', body: { name: 'New Shopper', email: 'new@example.com', password: 'SecurePass1' } });
  assert.equal(registered.response.status, 201);
  assert.equal(registered.payload.data.welcomeEmailSent, true);
  assert.deepEqual(sentEmails, ['new@example.com']);

  const category = await request(baseUrl, '/categories', { method: 'POST', token: adminToken, body: { name: 'Phase Five' } });
  const product = await request(baseUrl, '/products', { method: 'POST', token: adminToken, body: { name: 'DECI Nova', sku: 'NOVA-5', description: 'A complete product used to verify the Phase 5 services.', price: 24999, stock: 10, categoryId: category.payload.data.category.id } });
  const productId = product.payload.data.product.id;

  const created = await request(baseUrl, `/products/${productId}/reviews`, { method: 'POST', token: customerToken, body: { rating: 5, comment: 'Excellent product and clear shopping experience.' } });
  assert.equal(created.response.status, 201);
  const reviewId = created.payload.data.review.id;

  const duplicate = await request(baseUrl, `/products/${productId}/reviews`, { method: 'POST', token: customerToken, body: { rating: 4, comment: 'A duplicate review.' } });
  assert.equal(duplicate.response.status, 409);

  const listed = await request(baseUrl, `/products/${productId}/reviews?page=1&limit=10`);
  assert.equal(listed.payload.data.summary.averageRating, 5);
  assert.equal(listed.payload.data.summary.reviewCount, 1);

  const updated = await request(baseUrl, `/products/${productId}/reviews/${reviewId}`, { method: 'PATCH', token: customerToken, body: { rating: 4 } });
  assert.equal(updated.payload.data.review.rating, 4);

  const customerStats = await request(baseUrl, '/statistics/overview', { token: customerToken });
  assert.equal(customerStats.response.status, 403);
  const statistics = await request(baseUrl, '/statistics/overview', { token: adminToken });
  assert.equal(statistics.response.status, 200);
  assert.equal(statistics.payload.data.statistics.totalReviews, 1);
  assert.equal(statistics.payload.data.statistics.totalRevenue, 24999);
  assert.equal(statistics.payload.data.statistics.topProducts[0].quantity, 2);

  const logs = await request(baseUrl, '/activity-logs?page=1&limit=50', { token: adminToken });
  assert.equal(logs.response.status, 200);
  assert.ok(logs.payload.data.items.some((log) => log.action === 'PRODUCT_CREATED'));
  assert.ok(logs.payload.data.items.some((log) => log.action === 'REVIEW_CREATED'));
  assert.ok(logs.payload.data.items.some((log) => log.action === 'USER_REGISTERED'));

  const removed = await request(baseUrl, `/products/${productId}/reviews/${reviewId}`, { method: 'DELETE', token: customerToken });
  assert.equal(removed.response.status, 200);
});

test('seed data is deterministic and covers users, categories, products, and orders', async () => {
  const [{ seedCategories, seedProducts }, fs] = await Promise.all([
    import('../prisma/seedData.js'),
    import('node:fs/promises'),
  ]);
  assert.equal(seedCategories.length, 6);
  assert.equal(seedProducts.length, 12);
  assert.equal(new Set(seedCategories.map((category) => category.slug)).size, 6);
  assert.equal(new Set(seedProducts.map((product) => product.sku)).size, 12);
  const seedScript = await fs.readFile(new URL('../prisma/seed.js', import.meta.url), 'utf8');
  assert.match(seedScript, /prisma\.user\.upsert/);
  assert.match(seedScript, /prisma\.product\.upsert/);
  assert.match(seedScript, /prisma\.order\.create/);
});


test('Nodemailer welcome service builds a complete bilingual-safe message contract', async () => {
  const sent = [];
  const { createEmailService } = await import('../src/services/emailService.js');
  const service = createEmailService({ async sendMail(message) { sent.push(message); return { messageId: 'welcome-1' }; } });
  const result = await service.sendWelcomeEmail({ name: 'Mona <script>', email: 'mona@example.com' });
  assert.equal(result.messageId, 'welcome-1');
  assert.equal(sent[0].to, 'mona@example.com');
  assert.match(sent[0].subject, /Welcome/);
  assert.doesNotMatch(sent[0].html, /<script>/);
  assert.match(sent[0].text, /DECI\.Project/);
});
