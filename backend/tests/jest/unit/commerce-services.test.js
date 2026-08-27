import { createMemoryCommerce } from '../../helpers/memoryCommerce.js';
import { createCartService } from '../../../src/services/cartService.js';
import { createOrderService } from '../../../src/services/orderService.js';

function createFixture() {
  const memory = createMemoryCommerce({
    users: [{
      id: 'customer-1',
      name: 'Customer',
      email: 'customer@example.com',
      passwordHash: 'unused',
      role: 'CUSTOMER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  });
  memory.state.categories.push({
    id: 'category-1', name: 'Laptops', slug: 'laptops', description: null,
    createdAt: new Date(), updatedAt: new Date(),
  });
  memory.state.products.push({
    id: 'product-1', name: 'DECI Nova Laptop', slug: 'deci-nova-laptop', sku: 'DECI-NOVA-1',
    description: 'Test laptop', price: 10000, stock: 3, brand: 'DECI', isFeatured: true,
    isActive: true, categoryId: 'category-1', createdAt: new Date(), updatedAt: new Date(),
  });
  return memory;
}

describe('commerce business services', () => {
  test('calculates cart quantities and totals on the server', async () => {
    const memory = createFixture();
    const service = createCartService(memory.cartRepository, memory.productRepository);

    const cart = await service.add('customer-1', { productId: 'product-1', quantity: 2 });
    expect(cart.itemCount).toBe(2);
    expect(cart.subtotal).toBe(20000);
    expect(cart.total).toBe(20000);
    expect(cart.items[0]).toMatchObject({ quantity: 2, lineTotal: 20000 });
  });

  test('rejects cart quantities above available stock', async () => {
    const memory = createFixture();
    const service = createCartService(memory.cartRepository, memory.productRepository);

    await expect(service.add('customer-1', { productId: 'product-1', quantity: 4 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'INSUFFICIENT_STOCK' });
  });

  test('creates an order, reduces inventory, and clears the cart', async () => {
    const memory = createFixture();
    const cartService = createCartService(memory.cartRepository, memory.productRepository);
    const orderService = createOrderService(memory.orderRepository);
    await cartService.add('customer-1', { productId: 'product-1', quantity: 2 });

    const order = await orderService.checkout('customer-1', { shippingAddress: 'Cairo, Egypt' });
    const cart = await cartService.get('customer-1');

    expect(order.orderNumber).toMatch(/^DECI-\d{8}-[A-F0-9]{8}$/);
    expect(order.total).toBe(20000);
    expect(order.items[0]).toMatchObject({ productName: 'DECI Nova Laptop', quantity: 2 });
    expect(memory.state.products[0].stock).toBe(1);
    expect(cart.items).toHaveLength(0);
  });
});
