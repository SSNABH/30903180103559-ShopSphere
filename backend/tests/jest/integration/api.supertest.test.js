import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { hashPassword } from '../../../src/auth/password.js';
import { errorHandler } from '../../../src/middlewares/errorHandler.js';
import { notFound } from '../../../src/middlewares/notFound.js';
import { createAuthRouter } from '../../../src/routes/authRoutes.js';
import { createUserRouter } from '../../../src/routes/userRoutes.js';
import { createAuthService } from '../../../src/services/authService.js';
import { createUserService } from '../../../src/services/userService.js';

function createMemoryUserRepository(initialUsers = []) {
  const users = initialUsers.map((user) => ({ ...user }));
  const publicUser = ({ passwordHash, ...user }) => user;
  const locate = (id) => users.findIndex((user) => user.id === id);

  return {
    async findByEmail(email, { includePassword = false } = {}) {
      const user = users.find((item) => item.email === email);
      return user ? (includePassword ? { ...user } : publicUser(user)) : null;
    },
    async findById(id, { includePassword = false } = {}) {
      const user = users.find((item) => item.id === id);
      return user ? (includePassword ? { ...user } : publicUser(user)) : null;
    },
    async createWithCart(data) {
      const now = new Date();
      const user = {
        id: `user-${users.length + 1}`,
        role: 'CUSTOMER',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      users.push(user);
      return publicUser(user);
    },
    async updateProfile(id, data) {
      const index = locate(id);
      users[index] = { ...users[index], ...data, updatedAt: new Date(Date.now() + 1000) };
      return publicUser(users[index]);
    },
    async updatePassword(id, passwordHash) {
      const index = locate(id);
      users[index] = { ...users[index], passwordHash, updatedAt: new Date(Date.now() + 1000) };
      return publicUser(users[index]);
    },
    async touchSession(id) {
      const index = locate(id);
      users[index] = { ...users[index], updatedAt: new Date(Date.now() + 1000) };
      return publicUser(users[index]);
    },
    async list({ page, limit }) {
      return {
        items: users.map(publicUser),
        total: users.length,
        page,
        limit,
        pages: Math.ceil(users.length / limit),
      };
    },
  };
}

function createTestApp(userRepository) {
  const activityLogService = { record: async () => null };
  const emailService = { sendWelcomeEmail: async () => ({ messageId: 'jest-email' }) };
  const authService = createAuthService(userRepository, { emailService, activityLogService });
  const userService = createUserService(userRepository);
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.get('/api', (req, res) => {
    void req;
    res.json({ success: true, name: 'DECI.Project API', version: '1.0.0' });
  });
  app.use('/api/auth', createAuthRouter({ authService, userRepository }));
  app.use('/api/users', createUserRouter({ userService, userRepository }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('critical API endpoints through Supertest', () => {
  test('exposes API metadata and standardized missing-route responses', async () => {
    const app = createTestApp(createMemoryUserRepository());

    await request(app)
      .get('/api')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ success: true, name: 'DECI.Project API' });
      });

    await request(app)
      .get('/api/does-not-exist')
      .expect(404)
      .expect(({ body }) => {
        expect(body.success).toBe(false);
        expect(body.message).toMatch(/route not found/i);
      });
  });

  test('registers, refreshes, and protects a customer session', async () => {
    const app = createTestApp(createMemoryUserRepository());
    const agent = request.agent(app);

    const invalid = await agent.post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'weak' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');

    const registered = await agent.post('/api/auth/register').send({
      name: 'Mona Hassan',
      email: 'MONA@example.com',
      password: 'SecurePass1',
    });
    expect(registered.status).toBe(201);
    expect(registered.body.data.user).toMatchObject({ email: 'mona@example.com', role: 'CUSTOMER' });
    expect(registered.body.data.user.passwordHash).toBeUndefined();
    expect(registered.headers['set-cookie'].join(';')).toMatch(/deci_refresh=.*HttpOnly/i);

    await agent
      .post('/api/auth/refresh')
      .expect(200)
      .expect(({ body }) => expect(body.data.accessToken).toEqual(expect.any(String)));

    await request(app).get('/api/users/me').expect(401);
    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${registered.body.data.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data.user.email).toBe('mona@example.com'));
  });

  test('enforces Customer and Admin permissions', async () => {
    const now = new Date();
    const repository = createMemoryUserRepository([
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
    ]);
    const app = createTestApp(repository);

    const customer = await request(app).post('/api/auth/login').send({ email: 'customer@example.com', password: 'Customer1A' });
    await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${customer.body.data.accessToken}`)
      .expect(403);

    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'AdminPass1' });
    await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${admin.body.data.accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.total).toBe(2);
        expect(body.data.items[0].passwordHash).toBeUndefined();
      });
  });
});
