import { env } from '../config/env.js';

function refreshCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge,
  };
}

function sendUpdatedSession(res, result, message) {
  res.cookie('deci_refresh', result.refreshToken, refreshCookieOptions(result.refreshExpiresIn * 1_000));
  return res.json({
    success: true,
    message,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.accessExpiresIn,
    },
  });
}

export function createUserController(userService) {
  return {
    getProfile: async (req, res) => {
      const user = await userService.getProfile(req.user.id);
      return res.json({ success: true, data: { user } });
    },

    updateProfile: async (req, res) => {
      const result = await userService.updateProfile(req.user.id, req.validatedBody);
      return sendUpdatedSession(res, result, 'Profile updated successfully.');
    },

    changePassword: async (req, res) => {
      const result = await userService.changePassword(req.user.id, req.validatedBody);
      return sendUpdatedSession(res, result, 'Password changed successfully.');
    },

    listUsers: async (req, res) => {
      const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit ?? '20', 10) || 20));
      const result = await userService.listUsers({ page, limit });
      return res.json({ success: true, data: result });
    },
  };
}
