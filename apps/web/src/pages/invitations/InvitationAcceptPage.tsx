import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
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

  if (!token) {
    return (
      <PageContainer>
        <Card>
          <h1>유효하지 않은 초대</h1>
          <p>초대 토큰이 확인되지 않았습니다. 초대 링크를 다시 확인해주세요.</p>
        </Card>
      </PageContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <Card>
          <h1>로그인이 필요합니다</h1>
          <p>가계부 초대를 수락하려면 먼저 로그인해주세요.</p>
          <Button type="button" onClick={() => navigate('/login')}>
            로그인하기
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card>
        <h1>가계부 초대</h1>
        <p>초대를 수락하시겠습니까?</p>
        <ButtonRow>
          <Button type="button" disabled={isSubmitting} onClick={() => handleRespond(true)}>
            {isSubmitting ? '처리 중...' : '수락'}
          </Button>
          <SecondaryButton
            type="button"
            disabled={isSubmitting}
            onClick={() => handleRespond(false)}
          >
            거절
          </SecondaryButton>
        </ButtonRow>
      </Card>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 24px;
`;

const Card = styled.div`
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
  max-width: 420px;
  width: 100%;
  text-align: center;

  h1 {
    margin-bottom: 16px;
  }

  p {
    margin-bottom: 24px;
    color: #495057;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #0b5ed7;
  }

  &:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled(Button)`
  background: #f1f3f5;
  color: #343a40;

  &:hover {
    background: #e9ecef;
  }
`;
