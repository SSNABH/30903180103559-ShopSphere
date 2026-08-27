import { AppError } from '../utils/AppError.js';
import { serializeCart } from '../utils/commerceSerializers.js';

export function createCartService(cartRepository, productRepository) {
  return {
    async get(userId) {
      await cartRepository.ensure(userId);
      return serializeCart(await cartRepository.getByUserId(userId));
    },
    async add(userId, input) {
      const product = await productRepository.findById(input.productId);
      if (!product || !product.isActive) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
      const currentCart = await cartRepository.getByUserId(userId);
      const existing = currentCart?.items?.find((item) => item.productId === input.productId);
      const requested = (existing?.quantity ?? 0) + input.quantity;
      if (requested > product.stock) {
        throw new AppError(`Only ${product.stock} item(s) are available.`, 409, 'INSUFFICIENT_STOCK');
      }
      return serializeCart(await cartRepository.addItem(userId, input.productId, input.quantity));
    },
    async update(userId, itemId, quantity) {
      const item = await cartRepository.findItem(userId, itemId);
      if (!item) throw new AppError('Cart item was not found.', 404, 'CART_ITEM_NOT_FOUND');
      if (!item.product.isActive || quantity > item.product.stock) {
        throw new AppError(`Only ${item.product.stock} item(s) are available.`, 409, 'INSUFFICIENT_STOCK');
      }
      const cart = await cartRepository.updateItem(userId, itemId, quantity);
      return serializeCart(cart);
    },
    async remove(userId, itemId) {
      const cart = await cartRepository.removeItem(userId, itemId);
      if (!cart) throw new AppError('Cart item was not found.', 404, 'CART_ITEM_NOT_FOUND');
      return serializeCart(cart);
    },
    async clear(userId) {
      return serializeCart(await cartRepository.clear(userId));
    },
  };
}
