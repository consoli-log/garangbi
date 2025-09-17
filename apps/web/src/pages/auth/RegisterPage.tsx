import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { authService, notificationService } from '@services/index';
import { useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@garangbi/types';

const registerPageSchema = RegisterSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerPageSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerPageSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await authService.register(data);
      notificationService.success(
        '회원가입이 완료되었습니다. </br> 로그인 페이지로 이동합니다.',
      );
      navigate('/login');
    } catch (error: any) {
    }
  };

  return (
    <Container>
      <h1>회원가입</h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label>이메일</label>
          <Input {...formRegister('email')} />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </InputGroup>
        <InputGroup>
          <label>닉네임</label>
          <Input {...formRegister('nickname')} />
          {errors.nickname && (
            <ErrorMessage>{errors.nickname.message}</ErrorMessage>
          )}
        </InputGroup>
        <InputGroup>
          <label>비밀번호</label>
          <Input type="password" {...formRegister('password')} />
          {errors.password && (
            <ErrorMessage>{errors.password.message}</ErrorMessage>
          )}
        </InputGroup>
        <InputGroup>
          <label>비밀번호 확인</label>
          <Input type="password" {...formRegister('confirmPassword')} />
          {errors.confirmPassword && (
            <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>
          )}
        </InputGroup>
        <Button type="submit">가입하기</Button>
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