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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060c]/80 px-4 py-6">
      <div className="pixel-box flex w-full max-w-lg flex-col gap-4 bg-[#2a2d3f]">
        <h2 className="text-base font-bold uppercase tracking-widest text-pixel-yellow">
          보안 확인
        </h2>
        <p className="text-[11px] text-pixel-yellow">
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
            className="w-full rounded-none border-4 border-black bg-[#1d1f2a] px-4 py-3 text-[11px] uppercase tracking-wide text-pixel-yellow shadow-pixel-md focus:border-pixel-blue focus:outline-none"
          />
          {errorMessage ? (
            <p className="text-[11px] font-bold uppercase text-pixel-red">
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end gap-3">
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className={cn(
                  'pixel-button bg-pixel-red text-white hover:text-white',
                  'px-5',
                )}
              >
                로그아웃
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn('pixel-button bg-pixel-green text-black hover:text-black')}
            >
              {isSubmitting ? '확인 중...' : '확인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
