import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import styled from 'styled-components';

export function SocialCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      const loginAndRedirect = async () => {
        setToken(token);
        await fetchUser();
        navigate('/');
      };
      loginAndRedirect();
    } else {
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