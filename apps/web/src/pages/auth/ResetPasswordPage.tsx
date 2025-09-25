import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormContainer, Form, InputGroup, Input, Button, ErrorMessage } from '../../components/common/FormControls';
import { authService, notificationService } from '@services/index';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordSchema } from '@garangbi/types';

const pageSchema = ResetPasswordSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof pageSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.resetPassword({ token: data.token, password: data.password });
      notificationService.success('비밀번호가 성공적으로 변경되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (error) {
    }
  };

  if (!token) {
    return (
      <FormContainer>
        <h1>오류</h1>
        <p>유효하지 않은 접근입니다. 비밀번호 재설정 이메일을 다시 요청해주세요.</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <h1>새 비밀번호 설정</h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...formRegister('token')} />
        <InputGroup>
          <label>새 비밀번호</label>
          <Input type="password" {...formRegister('password')} />
          {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
        </InputGroup>
        <InputGroup>
          <label>새 비밀번호 확인</label>
          <Input type="password" {...formRegister('confirmPassword')} />
          {errors.confirmPassword && (
            <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>
          )}
        </InputGroup>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '변경 중...' : '비밀번호 변경하기'}
        </Button>
      </Form>
    </FormContainer>
  );
}