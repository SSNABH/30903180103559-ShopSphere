import { issueTokenPair } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { AppError } from '../utils/AppError.js';
import { serializeUser } from '../utils/userSerializer.js';

export function createUserService(userRepository) {
  return {
    async getProfile(userId) {
      const user = await userRepository.findById(userId);
      if (!user) throw new AppError('User was not found.', 404, 'USER_NOT_FOUND');
      return serializeUser(user);
    },

    async updateProfile(userId, input) {
      if (input.email) {
        const owner = await userRepository.findByEmail(input.email);
        if (owner && owner.id !== userId) {
          throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
        }
      }

      let user;
      try {
        user = await userRepository.updateProfile(userId, input);
      } catch (error) {
        if (error?.code === 'P2002') {
          throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
        }
        throw error;
      }
      const tokens = issueTokenPair(user);
      return { user: serializeUser(user), ...tokens };
    },

    async changePassword(userId, input) {
      const currentUser = await userRepository.findById(userId, { includePassword: true });
      if (!currentUser) throw new AppError('User was not found.', 404, 'USER_NOT_FOUND');

      const valid = await verifyPassword(input.currentPassword, currentUser.passwordHash);
      if (!valid) {
        throw new AppError('Current password is incorrect.', 400, 'CURRENT_PASSWORD_INCORRECT');
      }

      const passwordHash = await hashPassword(input.newPassword);
      const user = await userRepository.updatePassword(userId, passwordHash);
      const tokens = issueTokenPair(user);
      return { user: serializeUser(user), ...tokens };
    },

    async listUsers({ page, limit }) {
      const result = await userRepository.list({ page, limit });
      return { ...result, items: result.items.map(serializeUser) };
    },
  };
}
