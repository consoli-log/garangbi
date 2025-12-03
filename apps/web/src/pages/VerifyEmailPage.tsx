import { useEffect, useRef, useState } from 'react';
import { verifyEmail } from '../lib/api/auth';
import { ApiClientError } from '../lib/api/http';
import { cn } from '../lib/utils';

type VerifyState = 'loading' | 'success' | 'error' | 'missing';

export function VerifyEmailPage() {
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('이메일 인증을 확인하고 있어요...');
  const [email, setEmail] = useState<string | null>(null);
  const didRequestRef = useRef(false);

  useEffect(() => {
    if (didRequestRef.current) {
      return;
    }
    didRequestRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const tokenParam = params.get('token');

    if (!emailParam || !tokenParam) {
      setState('missing');
      setMessage('잘못된 인증 링크입니다. 이메일을 다시 확인해 주세요.');
      return;
    }

    setEmail(emailParam);
    verifyEmail({ email: emailParam, token: tokenParam })
      .then((payload) => {
        setState('success');
        setMessage(payload.message);
      })
      .catch((error) => {
        const fallback = '인증에 실패했습니다. 링크가 만료되었을 수 있어요.';
        if (error instanceof ApiClientError) {
          const apiMessage = error.response?.error.message;
          const resolvedMessage = Array.isArray(apiMessage)
            ? apiMessage.join(', ')
            : apiMessage ?? fallback;
          if (error.response?.error.code === 'ACC_ALREADY_VERIFIED') {
            setMessage(resolvedMessage);
            setState('success');
            return;
          }
          setMessage(resolvedMessage);
        } else {
          setMessage(fallback);
        }
        setState('error');
      });
  }, []);

  const isSuccess = state === 'success';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F8F3FF] to-white px-4 text-brand-primary">
      <main className="w-full max-w-xl rounded-3xl border-2 border-black bg-white p-8 shadow-card">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-black/60">Email Verification</p>
          <h1 className="mt-2 text-3xl font-bold text-black">이메일 인증을 완료해 주세요</h1>
        </div>

        <div
          className={cn(
            'mt-8 rounded-2xl border-2 p-6 text-center',
            isSuccess ? 'border-emerald-600 bg-emerald-50' : 'border-black/30 bg-white',
          )}
        >
          <p className="text-lg font-semibold text-black">
            {state === 'loading' && '인증 링크 확인 중'}
            {state === 'success' && '인증이 완료되었습니다'}
            {state === 'error' && '인증에 실패했습니다'}
            {state === 'missing' && '유효하지 않은 링크'}
          </p>
          <p className="mt-2 text-sm text-black/70">{message}</p>
          {email && (
            <p className="mt-1 text-xs text-black/50">
              이메일: <span className="font-semibold">{email}</span>
            </p>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <a
            href="/"
            className="block w-full rounded-2xl border-2 border-black bg-brand-secondary px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-secondary/90"
          >
            홈으로 돌아가기
          </a>
          {!isSuccess && (
            <p className="text-center text-xs text-black/60">
              링크가 만료되었다면 회원가입 화면에서 인증 메일을 다시 요청해 주세요.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
