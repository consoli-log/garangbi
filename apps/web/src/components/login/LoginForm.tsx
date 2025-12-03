import { useState } from 'react';
import type { FormEvent } from 'react';
import type { LoginRequest, LoginResponseData } from '@zzogaebook/types';
import { login } from '../../lib/api/auth';
import { ApiClientError } from '../../lib/api/http';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

const initialForm: LoginRequest = {
  email: '',
  password: '',
  rememberMe: false,
};

export function LoginForm() {
  const [form, setForm] = useState<LoginRequest>(initialForm);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successPayload, setSuccessPayload] = useState<LoginResponseData | null>(null);
  const setSession = useAuthStore((state) => state.setSession);

  const updateField = (field: keyof LoginRequest, value: string | boolean) => {
    setServerError(null);
    setSuccessPayload(null);
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      setServerError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    try {
      const payload = await login(form);
      setSession(payload.accessToken, payload.expiresIn);
      setSuccessPayload(payload);
      setForm((prev) => ({
        ...initialForm,
        rememberMe: prev.rememberMe,
      }));
      window.setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (error) {
      setSuccessPayload(null);
      if (error instanceof ApiClientError) {
        const rawMessage = error.response?.error.message;
        setServerError(
          Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage ?? error.message,
        );
      } else {
        setServerError('로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <h2 className="text-2xl font-semibold text-black">이메일 로그인</h2>
        <p className="mt-1 text-sm text-black/60">
          인증이 완료된 계정으로 접속해 쪼개부기를 시작해 보세요.
        </p>
      </div>

      {successPayload && (
        <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{successPayload.message}</p>
          <p className="mt-2 text-xs text-emerald-800">
            로그인 상태가 유지되는 동안 언제든 대시보드로 이동할 수 있어요.
          </p>
          <a
            href="/"
            className="mt-3 inline-flex items-center justify-center rounded-xl border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-600 hover:text-white"
          >
            홈으로 이동
          </a>
        </div>
      )}

      {serverError && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="login-email" className="text-sm font-semibold text-black">
            이메일
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-2 w-full rounded-xl border-2 border-black/60 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            placeholder="name@example.com"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="login-password" className="text-sm font-semibold text-black">
            비밀번호
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-2 border-black/60 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            placeholder="비밀번호"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold text-black">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-2 border-black/60 text-brand-secondary focus:ring-brand-secondary"
            checked={form.rememberMe ?? false}
            onChange={(event) => updateField('rememberMe', event.target.checked)}
          />
          로그인 상태 유지
        </label>
      </div>

      <button
        type="submit"
        className={cn(
          'w-full rounded-2xl border-2 border-black bg-brand-secondary px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition',
          isSubmitting ? 'opacity-60' : 'hover:bg-brand-secondary/90',
        )}
        disabled={isSubmitting}
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>

      <p className="text-center text-xs text-black/60">
        계정이 없나요?{' '}
        <a href="/" className="font-semibold text-brand-secondary underline">
          회원가입
        </a>
      </p>
    </form>
  );
}
