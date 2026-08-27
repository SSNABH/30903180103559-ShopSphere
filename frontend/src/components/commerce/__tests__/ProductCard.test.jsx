import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { commerceContent } from '../../../content/commerce.js';
import { renderWithAppProviders } from '../../../test/render.jsx';
import { sampleProduct } from '../../../test/handlers.js';
import { ProductCard } from '../ProductCard.jsx';

describe('ProductCard', () => {
  test('renders product data and routes anonymous users to login before adding', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(
      <Routes>
        <Route path="/products" element={<ProductCard product={sampleProduct} copy={commerceContent.en} language="en" />} />
        <Route path="/login" element={<h1>Login required</h1>} />
      </Routes>,
      { initialEntries: ['/products'] },
    );

    expect(screen.getByRole('heading', { name: sampleProduct.name })).toBeInTheDocument();
    expect(screen.getByText(/EGP/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: commerceContent.en.addToCart }));
    expect(await screen.findByRole('heading', { name: 'Login required' })).toBeInTheDocument();
  });

  test('adds an item for an authenticated customer', async () => {
    const user = userEvent.setup();
    const addItem = vi.fn().mockResolvedValue(undefined);
    renderWithAppProviders(
      <ProductCard product={sampleProduct} copy={commerceContent.en} language="en" />,
      {
        initialEntries: ['/products'],
        auth: { user: { id: 'user-1', role: 'CUSTOMER' }, initializing: false, isAuthenticated: true, isAdmin: false },
        cart: {
          cart: null, itemCount: 0, addItem,
          updateItem: vi.fn(), removeItem: vi.fn(),
          addMutation: { isPending: false, error: null },
          updateMutation: { isPending: false, error: null },
          removeMutation: { isPending: false, error: null },
        },
      },
    );

    await user.click(screen.getByRole('button', { name: commerceContent.en.addToCart }));
    expect(addItem).toHaveBeenCalledWith({ productId: sampleProduct.id, quantity: 1 });
  });
});
