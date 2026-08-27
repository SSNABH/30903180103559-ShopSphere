import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// The REST client the review service uses to talk to the main ShopSphere API.
//
// Two things the service deliberately does not own: the product catalogue,
// which lives in Postgres behind the main API, and user identity. Both are
// resolved here over REST rather than by reaching into another service's
// database.
const BASE = env.SHOPSPHERE_API_URL.replace(/\/$/, '');
const TIMEOUT_MS = 8_000;

async function request(path, { headers = {}, method = 'GET' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError('The ShopSphere API did not respond in time.', 504, 'UPSTREAM_TIMEOUT');
    }
    throw new AppError('The ShopSphere API could not be reached.', 502, 'UPSTREAM_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves a product by id or slug. Returns null when the product does not
 * exist or is inactive, which the caller turns into a 404.
 */
export async function fetchProduct(identifier) {
  const response = await request(`/api/products/${encodeURIComponent(identifier)}`);

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new AppError('The product could not be verified.', 502, 'UPSTREAM_ERROR');
  }

  const body = await response.json();
  const product = body?.data?.product ?? null;
  return product?.isActive ? product : null;
}

/**
 * Resolves the caller from their access token by asking the main API who they
 * are. Delegating this keeps the main application the single authority on
 * sessions: a deactivated account or a rotated token stops working here at the
 * same moment it stops working there, with no JWT secret shared between the
 * two services.
 */
export async function fetchCurrentUser(authorizationHeader) {
  const response = await request('/api/users/me', {
    headers: { Authorization: authorizationHeader },
  });

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new AppError('The session could not be verified.', 502, 'UPSTREAM_ERROR');
  }

  const body = await response.json();
  return body?.data?.user ?? null;
}
