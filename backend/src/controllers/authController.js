import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

function refreshCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge,
  };
}

function setRefreshCookie(res, token, expiresIn) {
  res.cookie('deci_refresh', token, refreshCookieOptions(expiresIn * 1_000));
}

function clearRefreshCookie(res) {
  const options = refreshCookieOptions(0);
  delete options.maxAge;
  res.clearCookie('deci_refresh', options);
}

function authResponse(res, status, result, message) {
  setRefreshCookie(res, result.refreshToken, result.refreshExpiresIn);
  return res.status(status).json({
    success: true,
    message,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.accessExpiresIn,
      ...(result.welcomeEmailSent !== undefined ? { welcomeEmailSent: result.welcomeEmailSent } : {}),
    },
  });
}

export function createAuthController(authService) {
  return {
    register: async (req, res) => {
      const result = await authService.register(req.validatedBody);
      return authResponse(res, 201, result, 'Account created successfully.');
    },

    login: async (req, res) => {
      const result = await authService.login(req.validatedBody);
      return authResponse(res, 200, result, 'Signed in successfully.');
    },

    refresh: async (req, res) => {
      const token = req.cookies.deci_refresh;
      if (!token) throw new AppError('Refresh token is required.', 401, 'REFRESH_REQUIRED');
      const result = await authService.refresh(token);
      return authResponse(res, 200, result, 'Session refreshed.');
    },

    logout: async (req, res) => {
      let userId = req.user?.id;
      if (!userId && req.cookies.deci_refresh) {
        const user = await authService.resolveRefreshUser(req.cookies.deci_refresh).catch(() => null);
        userId = user?.id;
      }
      await authService.logout(userId);
      clearRefreshCookie(res);
      return res.status(200).json({ success: true, message: 'Signed out successfully.' });
    },
  };
}
