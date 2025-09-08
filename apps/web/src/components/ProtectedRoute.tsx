import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const loc = useLocation();

  if (!hydrated) {
    return <div style={{ padding: 24 }}>초기화 중…</div>;
  }

  if (!token) return <Navigate to="/auth/login" replace state={{ from: loc }} />;
  return <>{children}</>;
}
