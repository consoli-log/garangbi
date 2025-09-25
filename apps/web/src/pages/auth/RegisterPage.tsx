import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService, notificationService } from '@services/index';
import { useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@garangbi/types';
import { FormContainer, Form, InputGroup, Input, Button, ErrorMessage } from '../../components/common/FormControls';

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
      notificationService.success('인증 메일이 발송되었습니다. 이메일을 확인해주세요.');
      navigate('/auth/email-notice');
    } catch (error: any) {
    }
  };

  return (
    <FormContainer>
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
    </FormContainer>
  );
}
