import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import styled from 'styled-components';
import { useAuthStore } from '@stores/authStore';
import { useNavigate } from 'react-router-dom';
import { LoginSchema, LoginDto } from '@garangbi/types';

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

  const onSubmit = async (data: LoginDto) => {
    try {
      await login(data);
      navigate('/');
    } catch (error: any) {
    }
  };

  return (
    <Container>
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
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
`;
const Form = styled.form`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-weight: bold; }
`;
const Input = styled.input`
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  &:focus { border-color: #007bff; outline: none; }
`;
const ErrorMessage = styled.p`
  color: #dc3545;
  font-size: 0.875rem;
  margin: 0;
`;
const Button = styled.button`
  padding: 12px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  &:hover { background-color: #0056b3; }
`;