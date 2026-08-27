import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });

try {
  const [{ default: App }, { AuthContext }, { CartContext }, { PreferencesContext }, { ErrorState }] = await Promise.all([
    vite.ssrLoadModule('/src/App.jsx'),
    vite.ssrLoadModule('/src/contexts/auth.js'),
    vite.ssrLoadModule('/src/contexts/cart.js'),
    vite.ssrLoadModule('/src/contexts/preferences.js'),
    vite.ssrLoadModule('/src/components/ui/AsyncState.jsx'),
  ]);

  const customer = { id: 'customer-ssr', name: 'Customer', email: 'customer@example.com', role: 'CUSTOMER' };
  const admin = { id: 'admin-ssr', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' };
  const sampleProduct = {
    id: 'product-1', name: 'SSR Phone', slug: 'ssr-phone', price: 12000, stock: 4,
    category: { id: 'category-1', name: 'Smartphones', slug: 'smartphones' }, images: [],
  };
  const sampleCart = {
    id: 'cart-1', userId: customer.id, itemCount: 1, subtotal: 12000, total: 12000,
    items: [{ id: 'item-1', quantity: 1, lineTotal: 12000, product: sampleProduct }],
  };

  function renderRoute(route, user = null, cart = null) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const auth = {
      user, initializing: false, isAuthenticated: Boolean(user), isAdmin: user?.role === 'ADMIN',
      register: async () => {}, login: async () => {}, logout: async () => {}, updateProfile: async () => {}, changePassword: async () => {},
    };
    const cartValue = {
      cart: cart ?? { id: null, items: [], itemCount: 0, subtotal: 0, total: 0 },
      itemCount: cart?.itemCount ?? 0,
      cartQuery: { data: cart, isPending: false, isError: false, refetch: async () => {} },
      addItem: async () => {}, updateItem: async () => {}, removeItem: async () => {}, checkout: async () => {},
      addMutation: { isPending: false, isError: false }, updateMutation: { isPending: false }, removeMutation: { isPending: false }, checkoutMutation: { isPending: false, isError: false },
    };
    const preferences = { language: 'en', theme: 'light', toggleLanguage: () => {}, toggleTheme: () => {} };
    return renderToString(
      React.createElement(MemoryRouter, { initialEntries: [route] },
        React.createElement(QueryClientProvider, { client: queryClient },
          React.createElement(PreferencesContext.Provider, { value: preferences },
            React.createElement(AuthContext.Provider, { value: auth },
              React.createElement(CartContext.Provider, { value: cartValue }, React.createElement(App)),
            ),
          ),
        ),
      ),
    );
  }

  const home = renderRoute('/');
  assert.match(home, /Technology that fits real life/);
  assert.match(home, /Loading products/);

  const listing = renderRoute('/products');
  assert.match(listing, /Find your next device/);
  assert.match(listing, /Search products/);

  const details = renderRoute('/products/dynamic-product');
  assert.match(details, /Loading products/);

  const cart = renderRoute('/cart', customer, sampleCart);
  assert.match(cart, /Your shopping cart/);
  assert.match(cart, /SSR Phone/);
  assert.match(cart, /12,000/);

  const orders = renderRoute('/orders', customer, sampleCart);
  assert.match(orders, /Order history/);

  const dashboard = renderRoute('/admin', admin);
  assert.match(dashboard, /Store operations at a glance/);

  const catalog = renderRoute('/admin/catalog', admin);
  assert.match(catalog, /Catalog management/);

  const users = renderRoute('/admin/users', admin);
  assert.match(users, /Registered users/);

  const customerAdmin = renderRoute('/admin', customer, sampleCart);
  assert.doesNotMatch(customerAdmin, /Store operations at a glance/);

  const errorState = renderToString(React.createElement(ErrorState, { title: 'Request failed', description: 'Backend unavailable', retryLabel: 'Retry', onRetry: () => {} }));
  assert.match(errorState, /Request failed/);
  assert.match(errorState, /Backend unavailable/);
  assert.match(errorState, /Retry/);

  const [appSource, apiSource, cartSource, productsSource] = await Promise.all([
    fs.readFile(path.join(root, 'src/App.jsx'), 'utf8'),
    fs.readFile(path.join(root, 'src/lib/api.js'), 'utf8'),
    fs.readFile(path.join(root, 'src/contexts/CartProvider.jsx'), 'utf8'),
    fs.readFile(path.join(root, 'src/pages/ProductsPage.jsx'), 'utf8'),
  ]);
  for (const route of ['HomePage', 'ProductsPage', 'ProductDetailsPage', 'CartPage', 'AdminDashboardPage']) assert.match(appSource, new RegExp(route));
  assert.match(appSource, /products\/:identifier/);
  assert.match(apiSource, /axios\.create/);
  assert.match(cartSource, /useQuery/);
  assert.match(cartSource, /CartContext\.Provider/);
  assert.match(productsSource, /useSearchParams/);

  console.log('Phase 4 SSR and architecture verification passed (9 frontend rubric areas).');
} finally {
  await vite.close();
}
