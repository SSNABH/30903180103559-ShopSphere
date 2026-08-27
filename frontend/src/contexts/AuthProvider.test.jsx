import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { api, clearAccessToken } from '../lib/api.js';
import { server } from '../test/server.js';
import { AuthProvider } from './AuthProvider.jsx';
import { useAuth } from './auth.js';

const account = { id: 'user-1', name: 'Mona', email: 'mona@example.com', role: 'CUSTOMER', isActive: true };

function SessionHarness() {
  const auth = useAuth();
  return (
    <div>
      <span>{auth.initializing ? 'initializing' : auth.isAuthenticated ? 'signed-in' : 'signed-out'}</span>
      <button onClick={() => auth.login({ email: account.email, password: 'SecurePass1' })}>Login</button>
      <button onClick={() => api.get('/protected').then(() => {}).catch(() => {})}>Protected request</button>
    </div>
  );
}

describe('AuthProvider session synchronization', () => {
  afterEach(() => clearAccessToken());

  test('clears React authentication state when refresh fails', async () => {
    server.use(
      http.post('http://localhost:5000/api/auth/refresh', () => HttpResponse.json(
        { success: false, message: 'Session expired' },
        { status: 401 },
      )),
      http.post('http://localhost:5000/api/auth/login', () => HttpResponse.json({
        success: true,
        data: { user: account, accessToken: 'access-token' },
      })),
      http.get('http://localhost:5000/api/protected', () => HttpResponse.json(
        { success: false, message: 'Access expired' },
        { status: 401 },
      )),
    );

    const browser = userEvent.setup();
    render(<AuthProvider><SessionHarness /></AuthProvider>);

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('signed-in')).toBeInTheDocument();

    await browser.click(screen.getByRole('button', { name: 'Protected request' }));
    expect(await screen.findByText('signed-out')).toBeInTheDocument();
  });

  test('keeps the user signed in when refresh succeeds and retries once', async () => {
    let refreshCalls = 0;
    let protectedCalls = 0;
    server.use(
      http.post('http://localhost:5000/api/auth/refresh', () => {
        refreshCalls += 1;
        if (refreshCalls === 1) {
          return HttpResponse.json({ success: false, message: 'No initial session' }, { status: 401 });
        }
        return HttpResponse.json({
          success: true,
          data: { user: account, accessToken: 'refreshed-token' },
        });
      }),
      http.post('http://localhost:5000/api/auth/login', () => HttpResponse.json({
        success: true,
        data: { user: account, accessToken: 'access-token' },
      })),
      http.get('http://localhost:5000/api/protected', ({ request }) => {
        protectedCalls += 1;
        if (protectedCalls === 1) {
          return HttpResponse.json({ success: false, message: 'Access expired' }, { status: 401 });
        }
        return HttpResponse.json({ success: true, authorization: request.headers.get('authorization') });
      }),
    );

    const browser = userEvent.setup();
    render(<AuthProvider><SessionHarness /></AuthProvider>);

    expect(await screen.findByText('signed-out')).toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Login' }));
    expect(await screen.findByText('signed-in')).toBeInTheDocument();

    await browser.click(screen.getByRole('button', { name: 'Protected request' }));
    await waitFor(() => expect(protectedCalls).toBe(2));
    expect(screen.getByText('signed-in')).toBeInTheDocument();
    expect(refreshCalls).toBe(2);
  });
});
