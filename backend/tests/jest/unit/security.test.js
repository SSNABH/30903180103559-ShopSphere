const [{ hashPassword, verifyPassword }, jwt, { slugify }] = await Promise.all([
  import('../../../src/auth/password.js'),
  import('../../../src/auth/jwt.js'),
  import('../../../src/utils/slugify.js'),
]);

describe('backend security utilities', () => {
  test('hashes passwords with a random salt and verifies only the correct password', async () => {
    const first = await hashPassword('SecurePass1');
    const second = await hashPassword('SecurePass1');

    expect(first).toMatch(/^scrypt\$/);
    expect(second).toMatch(/^scrypt\$/);
    expect(first).not.toBe(second);
    await expect(verifyPassword('SecurePass1', first)).resolves.toBe(true);
    await expect(verifyPassword('WrongPass1', first)).resolves.toBe(false);
    await expect(verifyPassword('SecurePass1', 'invalid-hash')).resolves.toBe(false);
  });

  test('issues signed access and refresh tokens with the expected claims', () => {
    const user = {
      id: 'user-123',
      role: 'ADMIN',
      updatedAt: new Date('2026-07-20T10:00:00.000Z'),
    };
    const pair = jwt.issueTokenPair(user);
    const access = jwt.verifyAccessToken(pair.accessToken);
    const refresh = jwt.verifyRefreshToken(pair.refreshToken);

    expect(access).toMatchObject({ sub: user.id, role: 'ADMIN', type: 'access' });
    expect(refresh).toMatchObject({ sub: user.id, role: 'ADMIN', type: 'refresh' });
    expect(pair.accessExpiresIn).toBe(900);
    expect(pair.refreshExpiresIn).toBe(604800);
    expect(() => jwt.verifyAccessToken(`${pair.accessToken}tampered`)).toThrow(/invalid/i);
    expect(() => jwt.verifyAccessToken(pair.refreshToken)).toThrow(/invalid|type/i);
  });

  test('converts supported durations and rejects unsupported ones', () => {
    expect(jwt.durationToSeconds('30s')).toBe(30);
    expect(jwt.durationToSeconds('15m')).toBe(900);
    expect(jwt.durationToSeconds('2h')).toBe(7200);
    expect(jwt.durationToSeconds('7d')).toBe(604800);
    expect(() => jwt.durationToSeconds('1w')).toThrow(/unsupported/i);
  });

  test('creates safe English and Arabic slugs', () => {
    expect(slugify('DECI Project Laptop 15')).toBe('deci-project-laptop-15');
    expect(slugify('هواتف ذكية')).toBe('هواتف-ذكية');
    expect(slugify('  Café & Audio  ')).toBe('cafe-audio');
  });
});
