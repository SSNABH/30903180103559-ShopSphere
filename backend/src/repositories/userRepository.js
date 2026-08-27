import { prisma } from '../config/prisma.js';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const authenticationSelect = {
  ...publicSelect,
  passwordHash: true,
};

export function createUserRepository(client = prisma) {
  return {
    findByEmail(email, { includePassword = false } = {}) {
      return client.user.findUnique({
        where: { email },
        select: includePassword ? authenticationSelect : publicSelect,
      });
    },

    findById(id, { includePassword = false } = {}) {
      return client.user.findUnique({
        where: { id },
        select: includePassword ? authenticationSelect : publicSelect,
      });
    },

    createWithCart(data) {
      return client.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data,
          select: publicSelect,
        });
        await transaction.cart.create({ data: { userId: user.id } });
        return user;
      });
    },

    updateProfile(id, data) {
      return client.user.update({
        where: { id },
        data,
        select: publicSelect,
      });
    },

    updatePassword(id, passwordHash) {
      return client.user.update({
        where: { id },
        data: { passwordHash, updatedAt: new Date() },
        select: publicSelect,
      });
    },

    touchSession(id) {
      return client.user.update({
        where: { id },
        data: { updatedAt: new Date() },
        select: publicSelect,
      });
    },

    async list({ page = 1, limit = 20 } = {}) {
      const [items, total] = await client.$transaction([
        client.user.findMany({
          select: publicSelect,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        client.user.count(),
      ]);
      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    },
  };
}

export const userRepository = createUserRepository();
