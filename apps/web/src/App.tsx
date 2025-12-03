import { useEffect } from 'react';
import { EmailSignupPage } from './pages/EmailSignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { useAuthStore, authSelectors } from './stores/authStore';

function resolvePathname() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path) {
    return '/';
  }
  return path;
}

export default function App() {
  const pathname = resolvePathname();
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const initialized = useAuthStore(authSelectors.initialized);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-brand-primary">
        <p className="rounded-2xl border-2 border-black px-6 py-4 text-sm font-semibold">
          로그인 상태를 확인하고 있어요...
        </p>
      </div>
    );
  }

  if (pathname === '/verify-email') {
    return <VerifyEmailPage />;
  }

  if (pathname === '/login') {
    return <LoginPage />;
  }

  if (pathname === '/') {
    return isAuthenticated ? <HomePage /> : <EmailSignupPage />;
  }

  return <EmailSignupPage />;
}
