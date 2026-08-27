import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth.js';

export function AdminRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
