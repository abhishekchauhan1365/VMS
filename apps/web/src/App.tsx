import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Kiosk from './pages/Kiosk';
import EPass from './pages/EPass';
import InviteVisitors from './pages/host/InviteVisitors';
import Approvals from './pages/host/Approvals';
import History from './pages/host/History';
import Board from './pages/desk/Board';
import WalkIn from './pages/desk/WalkIn';
import Policies from './pages/admin/Policies';
import Watchlist from './pages/admin/Watchlist';
import Analytics from './pages/admin/Analytics';
import AuditLog from './pages/admin/AuditLog';

const roleHome: Record<string, string> = {
  ADMIN: '/admin/analytics',
  HOST: '/host/invite',
  SECURITY: '/desk/board',
};

function RoleRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? (roleHome[user.role] ?? '/login') : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/pass/:token" element={<EPass />} />

        <Route element={<ProtectedRoute roles={['HOST']} />}>
          <Route path="/host/invite" element={<InviteVisitors />} />
          <Route path="/host/approvals" element={<Approvals />} />
          <Route path="/host/history" element={<History />} />
        </Route>

        <Route element={<ProtectedRoute roles={['SECURITY', 'ADMIN']} />}>
          <Route path="/desk/board" element={<Board />} />
          <Route path="/desk/walk-in" element={<WalkIn />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/admin/policies" element={<Policies />} />
          <Route path="/admin/watchlist" element={<Watchlist />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/audit" element={<AuditLog />} />
        </Route>

        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
