import { useEffect } from 'react';
import { LoginForm } from '../components/login/LoginForm';
import { useAuthStore, authSelectors } from '../stores/authStore';

export function LoginPage() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const initialized = useAuthStore(authSelectors.initialized);
  const isAuthenticated = useAuthStore(authSelectors.isAuthenticated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      window.location.href = '/';
    }
  }, [initialized, isAuthenticated]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-brand-primary">
        <p className="rounded-2xl border-2 border-black px-6 py-4 text-sm font-semibold">
          로그인 상태를 확인하고 있어요...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-10 text-brand-primary md:px-8 lg:px-12">
      <header className="mx-auto w-full max-w-2xl pb-8 text-center">
        <h1 className="text-3xl font-bold leading-snug text-brand-primary md:text-4xl">
          다시 만나서 반가워요!
          <br />
          쪼개부기에 로그인하세요
        </h1>
        <p className="mt-4 text-base text-black/70 md:text-lg">
          이메일 인증을 마친 계정으로 로그인하면 저장된 자산과 예산을 이어서 관리할 수 있어요.
        </p>
      </header>

      <main className="mx-auto w-full max-w-2xl rounded-3xl border-2 border-black bg-white p-6 shadow-card ring-2 ring-black/5 md:p-10">
        <LoginForm />
      </main>
    </div>
  );
}
