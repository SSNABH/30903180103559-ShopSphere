import { verifyAccessToken } from '../auth/jwt.js';
import { AppError } from '../utils/AppError.js';
import { serializeUser } from '../utils/userSerializer.js';

function bearerToken(header) {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function sessionMatches(user, payload) {
  return new Date(user.updatedAt).getTime().toString() === payload.sv;
}

export function createAuthenticate(userRepository) {
  return async function authenticate(req, res, next) {
    try {
      const token = bearerToken(req.headers.authorization);
      if (!token) throw new AppError('Sign in to access this resource.', 401, 'AUTH_REQUIRED');

      const payload = verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user || !user.isActive || !sessionMatches(user, payload)) {
        throw new AppError('Your session is no longer valid.', 401, 'SESSION_INVALID');
      }
      if (user.role !== payload.role) {
        throw new AppError('Your account permissions have changed. Sign in again.', 401, 'SESSION_INVALID');
      }

      req.auth = payload;
      req.user = serializeUser(user);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function createOptionalAuthenticate(userRepository) {
  return async function optionalAuthenticate(req, res, next) {
    const token = bearerToken(req.headers.authorization);
    if (!token) return next();

    try {
      const payload = verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (user && user.isActive && sessionMatches(user, payload)) {
        req.auth = payload;
        req.user = serializeUser(user);
      }
    } catch {
      // Logout must remain idempotent even when the access token is expired or malformed.
    }
    return next();
  };
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
    }
    return next();
  };
}
