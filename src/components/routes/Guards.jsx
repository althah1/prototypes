import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

export function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

/* RBAC: halaman hanya untuk role tertentu (kriteria #5) */
export function RequireRole({ roles }) {
  const { user, homePath } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, homePath } = useAuth();
  return user ? <Navigate to={homePath(user.role)} replace /> : <Outlet />;
}