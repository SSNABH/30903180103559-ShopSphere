import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../contexts/auth.js';
import { CartContext } from '../contexts/cart.js';
import { PreferencesContext } from '../contexts/preferences.js';

export function renderWithAppProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const auth = options.auth ?? {
    user: null,
    initializing: false,
    isAuthenticated: false,
    isAdmin: false,
  };
  const cart = options.cart ?? {
    cart: null,
    itemCount: 0,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    addMutation: { isPending: false, error: null },
    updateMutation: { isPending: false, error: null },
    removeMutation: { isPending: false, error: null },
  };
  const preferences = options.preferences ?? {
    language: 'en',
    direction: 'ltr',
    theme: 'light',
    toggleTheme: vi.fn(),
    toggleLanguage: vi.fn(),
  };

  return {
    queryClient,
    auth,
    cart,
    ...render(
      <MemoryRouter initialEntries={options.initialEntries ?? ['/']}>
        <QueryClientProvider client={queryClient}>
          <PreferencesContext.Provider value={preferences}>
            <AuthContext.Provider value={auth}>
              <CartContext.Provider value={cart}>{ui}</CartContext.Provider>
            </AuthContext.Provider>
          </PreferencesContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  };
}
