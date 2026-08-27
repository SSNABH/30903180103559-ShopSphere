import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { serializeOrder } from '../utils/commerceSerializers.js';

function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `DECI-${date}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function createOrderService(orderRepository) {
  return {
    async checkout(userId, input) {
      const result = await orderRepository.checkout({ userId, orderNumber: orderNumber(), shippingAddress: input.shippingAddress });
      if (result.kind === 'EMPTY') throw new AppError('Your cart is empty.', 400, 'CART_EMPTY');
      if (result.kind === 'UNAVAILABLE') throw new AppError(`${result.product.name} is no longer available.`, 409, 'PRODUCT_UNAVAILABLE');
      if (result.kind === 'STOCK') throw new AppError(`${result.product.name} does not have enough stock.`, 409, 'INSUFFICIENT_STOCK');
      return serializeOrder(result.order);
    },
    async listMine(userId, { page, limit }) {
      const result = await orderRepository.listForUser(userId, { page, limit });
      return { ...result, items: result.items.map(serializeOrder) };
    },
    async get(user, id) {
      const order = await orderRepository.findByIdForUser(id, user.id, user.role === 'ADMIN');
      if (!order) throw new AppError('Order was not found.', 404, 'ORDER_NOT_FOUND');
      return serializeOrder(order);
    },
  };
}
