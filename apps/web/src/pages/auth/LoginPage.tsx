import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { LoginSchema, LoginDto } from '@garangbi/types';
import { FormContainer, Form, InputGroup, Input, Button, ErrorMessage } from '../../components/common/FormControls';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(LoginSchema),
  });

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const onSubmit = async (data: LoginDto) => {
    try {
      await login(data);
      navigate('/');
    } catch (error: any) {
    }
  };

  return (
    <FormContainer>
      <h1>로그인</h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label>이메일</label>
          <Input {...register('email')} />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </InputGroup>
        <InputGroup>
          <label>비밀번호</label>
          <Input type="password" {...register('password')} />
          {errors.password && (
            <ErrorMessage>{errors.password.message}</ErrorMessage>
          )}
        </InputGroup>
        <Button type="submit">로그인</Button>
      </Form>
      <Divider>OR</Divider>
      <GoogleButton onClick={handleGoogleLogin}>
        Google 계정으로 로그인
      </GoogleButton>
      <ExtraLinks>
        <Link to="/request-password-reset">비밀번호를 잊으셨나요?</Link>
        <span> | </span>
        <Link to="/register">회원가입</Link>
      </ExtraLinks>
    </FormContainer>
  );
}

const Divider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  color: #888;
  margin: 16px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #ddd;
  }

  &:not(:empty)::before {
    margin-right: 0.5em;
  }

  &:not(:empty)::after {
    margin-left: 0.5em;
  }
`;

const GoogleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #ffffff;
  color: #333;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const ExtraLinks = styled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
  a {
    color: #007bff;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
`;