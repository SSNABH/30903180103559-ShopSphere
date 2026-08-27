import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AdminUsersPage } from '../AdminUsersPage.jsx';
import { renderWithAppProviders } from '../../test/render.jsx';
import { server } from '../../test/server.js';

function user(id, role = 'CUSTOMER') {
  return {
    id,
    name: `User ${id}`,
    email: `${id}@example.com`,
    role,
    isActive: true,
    createdAt: '2026-07-20T10:00:00.000Z',
  };
}

describe('AdminUsersPage', () => {
  test('uses the API total and requests subsequent pages', async () => {
    server.use(
      http.get('http://localhost:5000/api/users', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
        const items = page === 1 ? [user('admin-1', 'ADMIN')] : [user('customer-21')];
        return HttpResponse.json({
          success: true,
          data: { items, total: 47, page, limit: 20, pages: 3 },
        });
      }),
    );

    const browser = userEvent.setup();
    renderWithAppProviders(<AdminUsersPage />);

    expect(await screen.findByText('47')).toBeInTheDocument();
    expect(screen.getByText('Admins on this page')).toBeInTheDocument();
    expect(screen.getByText('admin-1@example.com')).toBeInTheDocument();

    await browser.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('customer-21@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  test('renders the empty directory state returned by the API', async () => {
    server.use(
      http.get('http://localhost:5000/api/users', () => HttpResponse.json({
        success: true,
        data: { items: [], total: 0, page: 1, limit: 20, pages: 0 },
      })),
    );

    renderWithAppProviders(<AdminUsersPage />);

    expect(await screen.findByText('No users were returned.')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  test('shows an API error and successfully retries the directory request', async () => {
    let shouldFail = true;
    server.use(
      http.get('http://localhost:5000/api/users', () => {
        if (shouldFail) {
          shouldFail = false;
          return HttpResponse.json({ success: false, message: 'The user directory is temporarily unavailable.' }, { status: 503 });
        }
        return HttpResponse.json({
          success: true,
          data: { items: [user('customer-1')], total: 1, page: 1, limit: 20, pages: 1 },
        });
      }),
    );

    const browser = userEvent.setup();
    renderWithAppProviders(<AdminUsersPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The user directory is temporarily unavailable.');
    await browser.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('customer-1@example.com')).toBeInTheDocument();
  });
});
