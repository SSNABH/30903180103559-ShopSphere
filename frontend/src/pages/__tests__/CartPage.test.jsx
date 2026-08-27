import { screen } from '@testing-library/react';
import { CartPage } from '../CartPage.jsx';
import { renderWithAppProviders } from '../../test/render.jsx';

function cartContext(quantity, stock) {
  const product = {
    id: 'product-1',
    name: 'Stock Limited Laptop',
    slug: 'stock-limited-laptop',
    price: 1000,
    stock,
    category: { id: 'category-1', name: 'Laptops', slug: 'laptops' },
    images: [],
  };
  return {
    cart: {
      items: [{ id: 'item-1', quantity, lineTotal: quantity * product.price, product }],
      itemCount: quantity,
      subtotal: quantity * product.price,
    },
    cartQuery: { isPending: false, isError: false },
    updateItem: vi.fn(async () => null),
    removeItem: vi.fn(async () => null),
    checkout: vi.fn(async () => ({ orderNumber: 'ORDER-1' })),
    updateMutation: { isPending: false, isError: false, error: null },
    removeMutation: { isPending: false, isError: false, error: null },
    checkoutMutation: { isPending: false, isError: false, error: null },
  };
}

const authenticatedUser = {
  user: { id: 'customer-1', name: 'Customer', role: 'CUSTOMER' },
  initializing: false,
  isAuthenticated: true,
  isAdmin: false,
};

describe('CartPage stock quantity boundaries', () => {
  test('disables increasing quantity at available stock and shows stock visibly', () => {
    renderWithAppProviders(<CartPage />, { auth: authenticatedUser, cart: cartContext(2, 2) });

    expect(screen.getByText('Available stock: 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase quantity Stock Limited Laptop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease quantity Stock Limited Laptop' })).toBeEnabled();
  });

  test('prevents decreasing a cart line below one', () => {
    renderWithAppProviders(<CartPage />, { auth: authenticatedUser, cart: cartContext(1, 3) });

    expect(screen.getByRole('button', { name: 'Decrease quantity Stock Limited Laptop' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase quantity Stock Limited Laptop' })).toBeEnabled();
  });
});
