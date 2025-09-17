import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

export function EmailVerificationNoticePage() {
  return (
    <Container>
      <h1>이메일을 확인해주세요</h1>
      <p>회원가입을 완료하려면 이메일 주소로 발송된 인증 링크를 클릭해주세요.</p>
      <p>이메일을 받지 못하셨나요? 스팸함을 확인해보세요.</p>
      <Link to="/login">로그인 페이지로 돌아가기</Link>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100vh;
  padding: 20px;
  gap: 1rem;
`;