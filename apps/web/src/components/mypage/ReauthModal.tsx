import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

type ReauthModalProps = {
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onVerify: (password: string) => Promise<void>;
  onLogout?: () => void;
};

export function ReauthModal({
  open,
  isSubmitting,
  errorMessage,
  onVerify,
  onLogout,
}: ReauthModalProps) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    await onVerify(password);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060c]/70 px-4 py-6">
      <div className="pixel-box flex w-full max-w-lg flex-col gap-5">
        <h2 className="text-2xl font-black uppercase tracking-tight text-pixel-ink">
          보안 확인
        </h2>
        <p className="text-sm text-pixel-ink/75">
          마이페이지에 접근하려면 현재 비밀번호를 입력해주세요.
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="현재 비밀번호"
            required
            autoFocus
            className="w-full rounded-[22px] border-4 border-black bg-white px-5 py-3 text-base font-semibold text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out placeholder:text-pixel-ink/35 focus:-translate-x-1 focus:-translate-y-1 focus:border-pixel-blue focus:shadow-pixel-md focus:outline-none"
          />
          {errorMessage ? (
            <p className="text-sm font-semibold uppercase text-pixel-red">{errorMessage}</p>
          ) : null}
          <div className="mt-2 flex justify-end gap-3">
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className={cn('pixel-button bg-pixel-red text-white hover:text-white', 'px-5')}
              >
                로그아웃
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn('pixel-button bg-pixel-green text-pixel-ink hover:text-pixel-ink')}
            >
              {isSubmitting ? '확인 중...' : '확인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
