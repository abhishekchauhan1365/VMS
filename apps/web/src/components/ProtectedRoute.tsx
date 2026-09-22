import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@vms/shared';
import { useAuth } from '../auth/AuthContext';
import { Navbar } from './Navbar';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy-400">Loading…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-navy-50/40">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
