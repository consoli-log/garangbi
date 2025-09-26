import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import styled from 'styled-components';
import { notificationService } from '@services/index';

export function SocialCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuthStore();
  const processing = useRef(false);

  useEffect(() => {
    if (processing.current) {
      return;
    }

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      notificationService.error('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
      navigate('/login');
      return;
    }

    if (token) {
      processing.current = true;
      const loginAndRedirect = async () => {
        try {
          setToken(token);
          await fetchUser(token); 
          navigate('/');
        } catch (e) {
          notificationService.error('사용자 정보를 가져오는데 실패했습니다.');
          navigate('/login');
        }
      };
      loginAndRedirect();
    }  else {
      // 토큰 없이 접근한 경우
      navigate('/login');
    }
  }, [searchParams, navigate, setToken, fetchUser]);

  return (
    <Container>
      <p>로그인 처리 중입니다...</p>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
`;