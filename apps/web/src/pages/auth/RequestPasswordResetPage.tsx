import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormContainer,
  Form,
  InputGroup,
  Input,
  Button,
  ErrorMessage,
} from '../../components/common/FormControls';
import { authService, notificationService } from '@services/index';
import { Link } from 'react-router-dom';

const requestSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요.'),
});
type FormData = z.infer<typeof requestSchema>;

export function RequestPasswordResetPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(requestSchema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.requestPasswordReset(data.email);
      notificationService.success(
        '이메일이 존재할 경우, 비밀번호 재설정 링크를 발송했습니다.',
      );
    } catch (error) {
    }
  };

  return (
    <FormContainer>
      <h1 className="mb-3 text-base font-bold uppercase tracking-widest text-pixel-yellow">
        비밀번호 찾기
      </h1>
      <p className="mb-6 text-[11px] text-pixel-yellow">
        가입 시 사용한 이메일 주소를 입력해주세요.
      </p>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label
            className="text-[11px] font-bold uppercase text-pixel-yellow"
            htmlFor="email"
          >
            이메일
          </label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </InputGroup>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '전송 중...' : '재설정 이메일 받기'}
        </Button>
      </Form>
      <Link
        className="mt-4 text-[11px] font-bold uppercase text-pixel-blue hover:text-pixel-yellow"
        to="/login"
      >
        로그인 페이지로 돌아가기
      </Link>
    </FormContainer>
  );
}
