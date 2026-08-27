import { issueTokenPair, verifyRefreshToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { AppError } from '../utils/AppError.js';
import { serializeUser } from '../utils/userSerializer.js';

function sessionMatches(user, payload) {
  return new Date(user.updatedAt).getTime().toString() === payload.sv;
}

export function createAuthService(userRepository, { emailService, activityLogService } = {}) {
  return {
    async register(input) {
      const existingUser = await userRepository.findByEmail(input.email);
      if (existingUser) {
        throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
      }

      const passwordHash = await hashPassword(input.password);
      let user;
      try {
        user = await userRepository.createWithCart({
          name: input.name,
          email: input.email,
          passwordHash,
          phone: input.phone || null,
          address: input.address || null,
        });
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
        }
        throw error;
      }

      let welcomeEmailSent = false;
      if (emailService) {
        try {
          await emailService.sendWelcomeEmail(user);
          welcomeEmailSent = true;
        } catch (error) {
          if (process.env.NODE_ENV !== 'test') console.error('Welcome email failed:', error.message);
        }
      }
      await activityLogService?.record({ actor: user, action: 'USER_REGISTERED', entityType: 'USER', entityId: user.id, metadata: { welcomeEmailSent } });

      const tokens = issueTokenPair(user);
      return { user: serializeUser(user), welcomeEmailSent, ...tokens };
    },

    async login(input) {
      const user = await userRepository.findByEmail(input.email, { includePassword: true });
      const passwordIsValid = user ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !passwordIsValid) {
        throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
      }
      if (!user.isActive) {
        throw new AppError('This account has been disabled.', 403, 'ACCOUNT_DISABLED');
      }

      await activityLogService?.record({ actor: user, action: 'USER_LOGIN', entityType: 'USER', entityId: user.id });
      const tokens = issueTokenPair(user);
      return { user: serializeUser(user), ...tokens };
    },

    async refresh(refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      const user = await userRepository.findById(payload.sub);
      if (!user || !user.isActive || !sessionMatches(user, payload)) {
        throw new AppError('Your session is no longer valid.', 401, 'SESSION_INVALID');
      }

      const tokens = issueTokenPair(user);
      return { user: serializeUser(user), ...tokens };
    },

    async resolveRefreshUser(refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      const user = await userRepository.findById(payload.sub);
      if (!user || !sessionMatches(user, payload)) return null;
      return user;
    },

    async logout(userId) {
      if (userId) await userRepository.touchSession(userId);
    },
  };
}
