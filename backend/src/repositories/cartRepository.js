import { prisma } from '../config/prisma.js';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        include: {
          category: true,
          images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        },
      },
    },
  },
};

export function createCartRepository(client = prisma) {
  return {
    getByUserId(userId) {
      return client.cart.findUnique({ where: { userId }, include: cartInclude });
    },
    async ensure(userId) {
      return client.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    },
    async addItem(userId, productId, quantity) {
      return client.$transaction(async (transaction) => {
        const cart = await transaction.cart.upsert({ where: { userId }, update: {}, create: { userId } });
        await transaction.cartItem.upsert({
          where: { cartId_productId: { cartId: cart.id, productId } },
          update: { quantity: { increment: quantity } },
          create: { cartId: cart.id, productId, quantity },
        });
        return transaction.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
      });
    },
    findItem(userId, itemId) {
      return client.cartItem.findFirst({
        where: { id: itemId, cart: { userId } },
        include: { product: true },
      });
    },
    async updateItem(userId, itemId, quantity) {
      return client.$transaction(async (transaction) => {
        const item = await transaction.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
        if (!item) return null;
        await transaction.cartItem.update({ where: { id: itemId }, data: { quantity } });
        return transaction.cart.findUnique({ where: { id: item.cartId }, include: cartInclude });
      });
    },
    async removeItem(userId, itemId) {
      return client.$transaction(async (transaction) => {
        const item = await transaction.cartItem.findFirst({ where: { id: itemId, cart: { userId } } });
        if (!item) return null;
        await transaction.cartItem.delete({ where: { id: itemId } });
        return transaction.cart.findUnique({ where: { id: item.cartId }, include: cartInclude });
      });
    },
    async clear(userId) {
      return client.$transaction(async (transaction) => {
        const cart = await transaction.cart.upsert({ where: { userId }, update: {}, create: { userId } });
        await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        return transaction.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
      });
    },
  };
}

export const cartRepository = createCartRepository();
