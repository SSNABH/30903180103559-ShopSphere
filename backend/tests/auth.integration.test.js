import assert from 'node:assert/strict';
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

const [{ createApp }, { hashPassword }] = await Promise.all([
  import('../src/app.js'),
  import('../src/auth/password.js'),
]);

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
      users[index] = { ...users[index], ...data, updatedAt: new Date() };
      return publicUser(users[index]);
    },
    async updatePassword(id, passwordHash) {
      const index = locate(id);
      users[index] = { ...users[index], passwordHash, updatedAt: new Date() };
      return publicUser(users[index]);
    },
    async touchSession(id) {
      const index = locate(id);
      users[index] = { ...users[index], updatedAt: new Date(Date.now() + 1_000) };
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

async function startApp(repository) {
  const app = createApp({ userRepository: repository });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  return { server, baseUrl };
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json();
  return { response, body };
}

test('registration validates input, creates a session, and protects profile routes', async (t) => {
  const repository = createMemoryUserRepository();
  const { server, baseUrl } = await startApp(repository);
  t.after(() => server.close());

  const invalid = await request(baseUrl, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'A', email: 'bad', password: 'weak' }),
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.code, 'VALIDATION_ERROR');

  const registered = await request(baseUrl, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Mona Hassan',
      email: 'MONA@example.com',
      password: 'SecurePass1',
    }),
  });
  assert.equal(registered.response.status, 201);
  assert.equal(registered.body.data.user.email, 'mona@example.com');
  assert.equal(registered.body.data.user.role, 'CUSTOMER');
  assert.equal('passwordHash' in registered.body.data.user, false);
  assert.equal(typeof registered.body.data.accessToken, 'string');
  const registrationCookie = registered.response.headers.get('set-cookie');
  assert.match(registrationCookie, /deci_refresh=/);
  assert.match(registrationCookie, /HttpOnly/i);
  assert.match(registrationCookie, /SameSite=Lax/i);

  const refreshed = await request(baseUrl, '/auth/refresh', {
    method: 'POST',
    headers: { cookie: registrationCookie.split(';')[0] },
  });
  assert.equal(refreshed.response.status, 200);
  assert.equal(refreshed.body.data.user.email, 'mona@example.com');

  const duplicate = await request(baseUrl, '/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Mona Again',
      email: 'mona@example.com',
      password: 'SecurePass2',
    }),
  });
  assert.equal(duplicate.response.status, 409);

  const anonymous = await request(baseUrl, '/users/me');
  assert.equal(anonymous.response.status, 401);

  const profile = await request(baseUrl, '/users/me', {
    headers: { authorization: `Bearer ${registered.body.data.accessToken}` },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.data.user.name, 'Mona Hassan');
});

test('login, logout invalidation, profile updates, and RBAC operate independently', async (t) => {
  const customerHash = await hashPassword('Customer1A');
  const adminHash = await hashPassword('AdminPass1');
  const now = new Date();
  const repository = createMemoryUserRepository([
    {
      id: 'customer-1',
      name: 'Customer User',
      email: 'customer@example.com',
      passwordHash: customerHash,
      phone: null,
      address: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminHash,
      phone: null,
      address: null,
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const { server, baseUrl } = await startApp(repository);
  t.after(() => server.close());

  const badLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@example.com', password: 'WrongPass1' }),
  });
  assert.equal(badLogin.response.status, 401);

  const customerLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@example.com', password: 'Customer1A' }),
  });
  const customerToken = customerLogin.body.data.accessToken;
  const forbidden = await request(baseUrl, '/users', {
    headers: { authorization: `Bearer ${customerToken}` },
  });
  assert.equal(forbidden.response.status, 403);

  const updated = await request(baseUrl, '/users/me', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({ name: 'Updated Customer', address: 'Cairo, Egypt' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.user.name, 'Updated Customer');

  const oldTokenAfterProfileUpdate = await request(baseUrl, '/users/me', {
    headers: { authorization: `Bearer ${customerToken}` },
  });
  assert.equal(oldTokenAfterProfileUpdate.response.status, 401);

  const newToken = updated.body.data.accessToken;
  const logout = await request(baseUrl, '/auth/logout', {
    method: 'POST',
    headers: { authorization: `Bearer ${newToken}` },
  });
  assert.equal(logout.response.status, 200);

  const afterLogout = await request(baseUrl, '/users/me', {
    headers: { authorization: `Bearer ${newToken}` },
  });
  assert.equal(afterLogout.response.status, 401);

  const adminLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@example.com', password: 'AdminPass1' }),
  });
  const users = await request(baseUrl, '/users', {
    headers: { authorization: `Bearer ${adminLogin.body.data.accessToken}` },
  });
  assert.equal(users.response.status, 200);
  assert.equal(users.body.data.total, 2);
  assert.equal('passwordHash' in users.body.data.items[0], false);
});

test('changing a password invalidates old tokens and credentials', async (t) => {
  const passwordHash = await hashPassword('OriginalPass1');
  const now = new Date();
  const repository = createMemoryUserRepository([
    {
      id: 'password-user',
      name: 'Password User',
      email: 'password@example.com',
      passwordHash,
      phone: null,
      address: null,
      role: 'CUSTOMER',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
  const { server, baseUrl } = await startApp(repository);
  t.after(() => server.close());

  const login = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'password@example.com', password: 'OriginalPass1' }),
  });
  const originalToken = login.body.data.accessToken;

  const changed = await request(baseUrl, '/users/me/password', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${originalToken}` },
    body: JSON.stringify({ currentPassword: 'OriginalPass1', newPassword: 'Replacement2A' }),
  });
  assert.equal(changed.response.status, 200);
  assert.equal(typeof changed.body.data.accessToken, 'string');

  const oldToken = await request(baseUrl, '/users/me', {
    headers: { authorization: `Bearer ${originalToken}` },
  });
  assert.equal(oldToken.response.status, 401);

  const oldPassword = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'password@example.com', password: 'OriginalPass1' }),
  });
  assert.equal(oldPassword.response.status, 401);

  const newPassword = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'password@example.com', password: 'Replacement2A' }),
  });
  assert.equal(newPassword.response.status, 200);
});
