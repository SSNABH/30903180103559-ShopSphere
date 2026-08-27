import { prisma } from '../config/prisma.js';

const orderInclude = { items: { orderBy: { id: 'asc' } } };

class CheckoutConflict extends Error {
  constructor(kind, product) {
    super(kind);
    this.kind = kind;
    this.product = product;
  }
}

export function createOrderRepository(client = prisma) {
  return {
    async checkout({ userId, orderNumber, shippingAddress }) {
      try {
        return await client.$transaction(async (transaction) => {
          const cart = await transaction.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: true } } },
          });
          if (!cart || cart.items.length === 0) return { kind: 'EMPTY' };

          for (const item of cart.items) {
            if (!item.product.isActive) throw new CheckoutConflict('UNAVAILABLE', item.product);
            if (item.product.stock < item.quantity) throw new CheckoutConflict('STOCK', item.product);
          }
          for (const item of cart.items) {
            const updated = await transaction.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity }, isActive: true },
              data: { stock: { decrement: item.quantity } },
            });
            if (updated.count !== 1) throw new CheckoutConflict('STOCK', item.product);
          }

          const subtotal = cart.items.reduce(
            (sum, item) => sum + Number(item.product.price) * item.quantity,
            0,
          );
          const order = await transaction.order.create({
            data: {
              orderNumber,
              userId,
              subtotal,
              shippingFee: 0,
              total: subtotal,
              shippingAddress,
              items: {
                create: cart.items.map((item) => ({
                  productId: item.productId,
                  productName: item.product.name,
                  productSku: item.product.sku,
                  unitPrice: item.product.price,
                  quantity: item.quantity,
                  lineTotal: Number(item.product.price) * item.quantity,
                })),
              },
            },
            include: orderInclude,
          });
          await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
          return { kind: 'SUCCESS', order };
        });
      } catch (error) {
        if (error instanceof CheckoutConflict) return { kind: error.kind, product: error.product };
        throw error;
      }
    },
    async listForUser(userId, { page, limit }) {
      const where = { userId };
      const [items, total] = await client.$transaction([
        client.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
        client.order.count({ where }),
      ]);
      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    },
    findByIdForUser(id, userId, isAdmin) {
      return client.order.findFirst({
        where: { id, ...(isAdmin ? {} : { userId }) },
        include: orderInclude,
      });
    },
  };
}

export const orderRepository = createOrderRepository();
