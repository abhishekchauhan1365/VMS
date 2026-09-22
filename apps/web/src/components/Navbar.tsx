import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/cn';

interface PendingVisit {
  id: string;
}

const linksByRole: Record<string, Array<{ to: string; label: string }>> = {
  HOST: [
    { to: '/host/invite', label: 'Invite Visitors' },
    { to: '/host/approvals', label: 'Approvals' },
    { to: '/host/history', label: 'My Visits' },
  ],
  SECURITY: [
    { to: '/desk/board', label: 'Visitors Board' },
    { to: '/desk/walk-in', label: 'Walk-in' },
    { to: '/kiosk', label: 'Kiosk' },
  ],
  ADMIN: [
    { to: '/admin/policies', label: 'Policies' },
    { to: '/admin/watchlist', label: 'Watchlist' },
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/audit', label: 'Audit Log' },
  ],
};

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: pending } = useQuery({
    queryKey: ['hosts', 'pending-count'],
    queryFn: () => apiFetch<{ visits: PendingVisit[] }>('/hosts/me/pending'),
    enabled: user?.role === 'HOST',
    refetchInterval: 30_000,
  });

  if (!user) return null;
  const links = linksByRole[user.role] ?? [];

  return (
    <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold text-navy-700">VMS</span>
          <nav className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'relative rounded-md px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50',
                    isActive && 'bg-navy-50 text-navy-800',
                  )
                }
              >
                {l.label}
                {l.to === '/host/approvals' && !!pending?.visits.length && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {pending.visits.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-navy-500">
            {user.name} <span className="text-navy-300">·</span> {user.role}
          </span>
          <button
            onClick={() => {
              void logout().then(() => navigate('/login'));
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-navy-500 hover:bg-navy-50"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
