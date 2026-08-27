import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
// Reviews are served by an independently deployed service, so they are called
// on their own origin rather than through the main API.
const reviewBaseURL = import.meta.env.VITE_REVIEW_SERVICE_URL ?? 'http://localhost:5100/api';
let accessToken = null;
let refreshPromise = null;
let authenticationExpiredHandler = null;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10_000,
});

// The review service reads the same access token but sets no cookies of its
// own, so it does not send credentials.
export const reviewApi = axios.create({
  baseURL: reviewBaseURL,
  timeout: 10_000,
});

const sessionApi = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10_000,
});

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

export function registerAuthenticationExpiredHandler(handler) {
  authenticationExpiredHandler = typeof handler === 'function' ? handler : null;

  return () => {
    if (authenticationExpiredHandler === handler) authenticationExpiredHandler = null;
  };
}

function notifyAuthenticationExpired() {
  try {
    authenticationExpiredHandler?.();
  } catch {
    // Session cleanup must not hide the original authentication failure.
  }
}

export async function refreshSession() {
  const response = await sessionApi.post('/auth/refresh');
  setAccessToken(response.data.data.accessToken);
  return response.data.data;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

reviewApi.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// An expired access token has to be refreshed for the review service too,
// otherwise posting a review after an idle spell fails where every other
// action would have recovered.
reviewApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });

    try {
      await refreshPromise;
      return reviewApi(original);
    } catch (refreshError) {
      clearAccessToken();
      notifyAuthenticationExpired();
      return Promise.reject(refreshError);
    }
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthenticationRequest = original?.url?.includes('/auth/');
    if (error.response?.status !== 401 || original?._retry || isAuthenticationRequest) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });

    try {
      await refreshPromise;
      return api(original);
    } catch (refreshError) {
      clearAccessToken();
      notifyAuthenticationExpired();
      return Promise.reject(refreshError);
    }
  },
);
