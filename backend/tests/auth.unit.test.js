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

const [{ hashPassword, verifyPassword }, { issueTokenPair, verifyAccessToken, verifyRefreshToken }] =
  await Promise.all([import('../src/auth/password.js'), import('../src/auth/jwt.js')]);

test('password hashes are salted and verifiable', async () => {
  const first = await hashPassword('SecurePass1');
  const second = await hashPassword('SecurePass1');

  assert.notEqual(first, second);
  assert.equal(await verifyPassword('SecurePass1', first), true);
  assert.equal(await verifyPassword('WrongPass1', first), false);
});

test('access and refresh JWTs contain the expected secure claims', () => {
  const user = {
    id: 'user-1',
    role: 'CUSTOMER',
    updatedAt: new Date('2026-07-20T10:00:00.000Z'),
  };
  const pair = issueTokenPair(user);
  const access = verifyAccessToken(pair.accessToken);
  const refresh = verifyRefreshToken(pair.refreshToken);

  assert.equal(access.sub, user.id);
  assert.equal(access.role, 'CUSTOMER');
  assert.equal(access.type, 'access');
  assert.equal(refresh.type, 'refresh');
  assert.equal(access.sv, new Date(user.updatedAt).getTime().toString());
  assert.throws(() => verifyAccessToken(`${pair.accessToken}tampered`), /invalid/i);
});
