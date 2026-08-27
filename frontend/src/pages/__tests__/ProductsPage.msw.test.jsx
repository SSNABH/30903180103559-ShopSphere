import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProductsPage } from '../ProductsPage.jsx';
import { renderWithAppProviders } from '../../test/render.jsx';
import { sampleProduct } from '../../test/handlers.js';
import { server } from '../../test/server.js';

function LocationProbe({ onLocation }) {
  const location = useLocation();

  useEffect(() => onLocation(location), [location, onLocation]);

  return null;
}

function HistoryControls() {
  const navigate = useNavigate();
  return <><button type="button" onClick={() => navigate(-1)}>history back</button><button type="button" onClick={() => navigate(1)}>history forward</button></>;
}

describe('ProductsPage with MSW API mocking', () => {
  test('loads categories and products from mocked backend APIs', async () => {
    renderWithAppProviders(<ProductsPage />, { initialEntries: ['/products'] });

    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByRole('heading', { name: sampleProduct.name })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Laptops' })).toBeInTheDocument();
    expect(screen.getByText(/1 results/i)).toBeInTheDocument();
  });

  test('shows a retryable error when the products API fails', async () => {
    server.use(
      http.get('http://localhost:5000/api/products', () => HttpResponse.json(
        { success: false, message: 'Catalog unavailable' },
        { status: 503 },
      )),
    );

    renderWithAppProviders(<ProductsPage />, { initialEntries: ['/products'] });
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog unavailable');
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
  });

  test('clears the search query when clearing catalog filters', async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<ProductsPage />, { initialEntries: ['/products?q=charger'] });

    const search = await screen.findByRole('textbox', { name: /search products/i });
    expect(search).toHaveValue('charger');
    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => expect(search).toHaveValue(''));
  });

  test('synchronizes an immediate re-search after clearing before debounce completes', async () => {
    const requests = [];
    const locations = [];
    const user = userEvent.setup();
    const onLocation = (location) => { locations.push(location); };

    server.use(
      http.get('http://localhost:5000/api/products', ({ request }) => {
        const query = new URL(request.url).searchParams.get('q');
        requests.push(query);
        return HttpResponse.json({
          success: true,
          data: { items: [sampleProduct], total: 1, page: 1, limit: 8, pages: 1 },
        });
      }),
    );

    renderWithAppProviders(
      <>
        <LocationProbe onLocation={onLocation} />
        <ProductsPage />
      </>,
      { initialEntries: ['/products?q=charger&page=2'] },
    );

    const search = await screen.findByRole('textbox', { name: /search products/i });
    await user.click(screen.getByRole('button', { name: /clear filters/i }));
    await user.type(search, 'headphones');

    await waitFor(() => expect(locations.at(-1).search).toBe('?q=headphones'));
    await waitFor(() => expect(requests).toContain('headphones'));
    expect(locations.at(-1).search).not.toContain('charger');
    expect(locations.at(-1).search).not.toContain('page=2');
  });

  test('restores Canvas then Pulse on browser-style Back/Forward without a stale debounce rewrite', async () => {
    const requests = [];
    const locations = [];
    const user = userEvent.setup();
    server.use(
      http.get('http://localhost:5000/api/products', ({ request }) => {
        const query = new URL(request.url).searchParams.get('q');
        requests.push(query);
        return HttpResponse.json({
          success: true,
          data: { items: [{ ...sampleProduct, name: query === 'Pulse' ? 'Pulse product' : 'Canvas product' }], total: 1, page: 1, limit: 8, pages: 1 },
        });
      }),
    );

    renderWithAppProviders(<><LocationProbe onLocation={(location) => { locations.push(location); }} /><HistoryControls /><ProductsPage /></>, {
      initialEntries: ['/products?q=Canvas'],
    });
    const search = await screen.findByRole('textbox', { name: /search products/i });
    expect(search).toHaveValue('Canvas');
    expect(await screen.findByRole('heading', { name: 'Canvas product' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'Pulse');
    await waitFor(() => expect(locations.at(-1).search).toBe('?q=Pulse'));
    expect(await screen.findByRole('heading', { name: 'Pulse product' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'history back' }));
    await waitFor(() => expect(search).toHaveValue('Canvas'));
    await waitFor(() => expect(locations.at(-1).search).toBe('?q=Canvas'));
    expect(await screen.findByRole('heading', { name: 'Canvas product' })).toBeInTheDocument();
    expect(requests).toContain('Canvas');

    await user.click(screen.getByRole('button', { name: 'history forward' }));
    await waitFor(() => expect(search).toHaveValue('Pulse'));
    await waitFor(() => expect(locations.at(-1).search).toBe('?q=Pulse'));
    expect(await screen.findByRole('heading', { name: 'Pulse product' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(locations.at(-1).search).toBe('?q=Pulse');
  });
});

test('keeps products usable and exposes a retry when categories fail', async () => {
  server.use(
    http.get('http://localhost:5000/api/categories', () => HttpResponse.json(
      { success: false, message: 'Categories unavailable' },
      { status: 503 },
    )),
  );

  renderWithAppProviders(<ProductsPage />, { initialEntries: ['/products'] });

  expect(await screen.findByRole('heading', { name: sampleProduct.name })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Categories unavailable');
  expect(screen.getByRole('combobox', { name: /category/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
});
