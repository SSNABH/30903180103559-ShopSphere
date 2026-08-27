import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  api,
  clearAccessToken,
  refreshSession,
  registerAuthenticationExpiredHandler,
  setAccessToken,
} from '../lib/api.js';
import { AuthContext } from './auth.js';

function unpack(response) {
  const data = response.data.data;
  setAccessToken(data.accessToken);
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => registerAuthenticationExpiredHandler(() => {
    clearAccessToken();
    setUser(null);
  }), []);

  useEffect(() => {
    let active = true;
    refreshSession()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        clearAccessToken();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(async (payload) => {
    const response = await api.post('/auth/register', payload);
    const nextUser = unpack(response);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback(async (payload) => {
    const response = await api.post('/auth/login', payload);
    const nextUser = unpack(response);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const response = await api.patch('/users/me', payload);
    const nextUser = unpack(response);
    setUser(nextUser);
    return nextUser;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const response = await api.patch('/users/me/password', payload);
    const nextUser = unpack(response);
    setUser(nextUser);
    return nextUser;
  }, []);

  const value = useMemo(
    () => ({
      user,
      initializing,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      register,
      login,
      logout,
      updateProfile,
      changePassword,
    }),
    [changePassword, initializing, login, logout, register, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
