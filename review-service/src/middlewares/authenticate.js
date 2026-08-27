import { fetchCurrentUser } from '../clients/shopsphereApi.js';
import { AppError } from '../utils/AppError.js';

// The caller's own access token is forwarded to the main API, which answers
// with the user it belongs to. The review service therefore verifies no tokens
// itself and holds no signing secret: a deactivated account or a rotated token
// stops working here at the same moment it stops working there.
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Sign in to access this resource.', 401, 'AUTH_REQUIRED');
    }

    const user = await fetchCurrentUser(header);
    if (!user) {
      throw new AppError('Your session is no longer valid.', 401, 'SESSION_INVALID');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
