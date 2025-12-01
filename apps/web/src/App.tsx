import { EmailSignupPage } from './pages/EmailSignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

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

  return <EmailSignupPage />;
}
