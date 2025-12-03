import { EmailSignupPage } from './pages/EmailSignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { LoginPage } from './pages/LoginPage';

function resolvePathname() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path) {
    return '/';
  }
  return path;
}

export default function App() {
  const pathname = resolvePathname();

  if (pathname === '/verify-email') {
    return <VerifyEmailPage />;
  }

  if (pathname === '/login') {
    return <LoginPage />;
  }

  return <EmailSignupPage />;
}
