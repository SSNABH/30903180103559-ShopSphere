import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const ISSUER = 'deci-project-api';
const AUDIENCE = 'deci-project-frontend';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signatureFor(unsignedToken, secret) {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url');
}

export function durationToSeconds(duration) {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) throw new Error(`Unsupported token duration: ${duration}`);
  const value = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3_600, d: 86_400 };
  return value * multipliers[match[2]];
}

function createToken({ user, type, secret, expiresIn }) {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: user.id,
    role: user.role,
    type,
    sv: new Date(user.updatedAt).getTime().toString(),
    iat: issuedAt,
    exp: issuedAt + durationToSeconds(expiresIn),
    jti: randomUUID(),
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  return `${unsignedToken}.${signatureFor(unsignedToken, secret)}`;
}

function verifyToken(token, { secret, expectedType }) {
  if (!token || typeof token !== 'string') {
    throw new AppError('Authentication token is required.', 401, 'TOKEN_REQUIRED');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('Authentication token is invalid.', 401, 'TOKEN_INVALID');
  }

  const unsignedToken = `${parts[0]}.${parts[1]}`;
  const expectedSignature = Buffer.from(signatureFor(unsignedToken, secret));
  const actualSignature = Buffer.from(parts[2]);
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw new AppError('Authentication token is invalid.', 401, 'TOKEN_INVALID');
  }

  let header;
  let payload;
  try {
    header = decode(parts[0]);
    payload = decode(parts[1]);
  } catch {
    throw new AppError('Authentication token is malformed.', 401, 'TOKEN_INVALID');
  }

  const now = Math.floor(Date.now() / 1_000);
  if (header.alg !== 'HS256' || payload.iss !== ISSUER || payload.aud !== AUDIENCE) {
    throw new AppError('Authentication token is invalid.', 401, 'TOKEN_INVALID');
  }
  if (payload.type !== expectedType) {
    throw new AppError('Authentication token type is invalid.', 401, 'TOKEN_TYPE_INVALID');
  }
  if (!payload.exp || payload.exp <= now) {
    throw new AppError('Authentication token has expired.', 401, 'TOKEN_EXPIRED');
  }
  if (!payload.sub || !payload.sv) {
    throw new AppError('Authentication token is incomplete.', 401, 'TOKEN_INVALID');
  }

  return payload;
}

export function issueTokenPair(user) {
  return {
    accessToken: createToken({
      user,
      type: 'access',
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }),
    refreshToken: createToken({
      user,
      type: 'refresh',
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }),
    accessExpiresIn: durationToSeconds(env.JWT_ACCESS_EXPIRES_IN),
    refreshExpiresIn: durationToSeconds(env.JWT_REFRESH_EXPIRES_IN),
  };
}

export function verifyAccessToken(token) {
  return verifyToken(token, {
    secret: env.JWT_ACCESS_SECRET,
    expectedType: 'access',
  });
}

export function verifyRefreshToken(token) {
  return verifyToken(token, {
    secret: env.JWT_REFRESH_SECRET,
    expectedType: 'refresh',
  });
}
