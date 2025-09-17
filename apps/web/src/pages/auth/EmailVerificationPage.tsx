import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService, notificationService } from '@services/index';
import styled from 'styled-components';

export function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('이메일 인증을 처리하고 있습니다...');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isProcessing) {
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setMessage('유효하지 않은 접근입니다.');
      return;
    }

    const processVerification = async () => {
      setIsProcessing(true);
      try {
        await authService.verifyEmail(token);
        notificationService.success('인증이 완료되었습니다. 로그인해주세요.');
        navigate('/login');
      } catch (error) {
        setMessage('인증에 실패했습니다. 링크가 만료되었거나 유효하지 않습니다.');
      }
    };

    processVerification();
  }, [searchParams, navigate, isProcessing]);

  return (
    <Container>
      <h1>이메일 인증</h1>
      <p>{message}</p>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;