import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { ledgerService, notificationService } from '@services/index';

export function InvitationAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRespond = useCallback(
    async (accept: boolean) => {
      if (!token) {
        notificationService.error('유효하지 않은 초대 링크입니다.');
        return;
      }

      try {
        setIsSubmitting(true);
        await ledgerService.respondInvitation(token, accept);
        notificationService.success(
          accept ? '초대를 수락했습니다.' : '초대를 거절했습니다.',
        );
        navigate('/mypage');
      } catch (error) {
        notificationService.error('초대 처리 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [token, navigate],
  );

  const containerClass =
    'flex min-h-screen items-center justify-center bg-pixel-dark px-6 py-10';
  const cardClass = 'pixel-box w-full max-w-md bg-[#2a2d3f] text-center';
  const primaryButtonClass =
    'pixel-button w-full bg-pixel-green text-black hover:text-black disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-600 disabled:text-gray-300';
  const secondaryButtonClass =
    'pixel-button w-full bg-pixel-red text-white hover:text-white disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-600 disabled:text-gray-300';

  if (!token) {
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <h1 className="mb-4 text-base font-bold uppercase tracking-widest text-pixel-yellow">
            유효하지 않은 초대
          </h1>
          <p className="text-[11px] text-pixel-yellow">
            초대 토큰이 확인되지 않았습니다. 초대 링크를 다시 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={containerClass}>
        <div className={cardClass}>
          <h1 className="mb-4 text-base font-bold uppercase tracking-widest text-pixel-yellow">
            로그인이 필요합니다
          </h1>
          <p className="mb-6 text-[11px] text-pixel-yellow">
            가계부 초대를 수락하려면 먼저 로그인해주세요.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={primaryButtonClass}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={cardClass}>
        <h1 className="mb-4 text-base font-bold uppercase tracking-widest text-pixel-yellow">
          가계부 초대
        </h1>
        <p className="mb-6 text-[11px] text-pixel-yellow">초대를 수락하시겠습니까?</p>
        <div className="flex flex-col gap-3 md:flex-row md:justify-center">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleRespond(true)}
            className={primaryButtonClass}
          >
            {isSubmitting ? '처리 중...' : '수락'}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleRespond(false)}
            className={secondaryButtonClass}
          >
            거절
          </button>
        </div>
      </div>
    </div>
  );
}
