import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
let accessToken = null;
let refreshPromise = null;
let authenticationExpiredHandler = null;

export const api = axios.create({
  baseURL,
  withCredentials: true,
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
