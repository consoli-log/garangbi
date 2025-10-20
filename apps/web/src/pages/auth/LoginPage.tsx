import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@stores/authStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { LoginSchema, LoginDto } from '@garangbi/types';
import {
  FormContainer,
  Form,
  InputGroup,
  Input,
  Button,
  ErrorMessage,
} from '../../components/common/FormControls';
import { notificationService } from '@services/index';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ?? '/';
  const { login } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto & { rememberMe: boolean }>({
    resolver: zodResolver(LoginSchema.extend({ rememberMe: z.boolean().optional() })),
    defaultValues: {
      rememberMe: false,
    },
  });

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/google';
  };

  const handleKakaoLogin = () => {
    window.location.href = 'http://localhost:3000/api/auth/kakao';
  };

  const onSubmit = async (data: LoginDto & { rememberMe?: boolean }) => {
    try {
      const { rememberMe, ...credentials } = data;
      await login(credentials, Boolean(rememberMe));
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '로그인에 실패했습니다. 입력 정보를 다시 확인해주세요.';
      notificationService.error(message);
    }
  };

  return (
    <FormContainer>
      <h1 className="mb-6 text-base font-bold uppercase tracking-widest text-pixel-yellow">
        로그인
      </h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            이메일
          </label>
          <Input {...register('email')} />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
        </InputGroup>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            비밀번호
          </label>
          <Input type="password" {...register('password')} />
          {errors.password && (
            <ErrorMessage>{errors.password.message}</ErrorMessage>
          )}
        </InputGroup>
        <div className="flex items-center justify-between text-[11px] text-pixel-yellow">
          <label className="flex items-center gap-2 font-bold uppercase">
            <input
              type="checkbox"
              className="h-4 w-4 border-4 border-black bg-[#1d1f2a] text-pixel-yellow focus:outline-none focus:ring-0"
              {...register('rememberMe')}
            />
            로그인 상태 유지
          </label>
        </div>
        <Button type="submit">로그인</Button>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wide text-pixel-yellow/70">
          <span className="h-[2px] flex-1 bg-pixel-yellow/50" />
          OR
          <span className="h-[2px] flex-1 bg-pixel-yellow/50" />
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="pixel-button w-full bg-pixel-blue text-black hover:text-black"
          >
            Google 계정으로 로그인
          </button>
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="pixel-button w-full bg-pixel-red text-white hover:text-white"
          >
            Kakao 계정으로 로그인
          </button>
        </div>
      </Form>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-pixel-yellow">
        <Link
          className="font-bold uppercase text-pixel-blue hover:text-pixel-yellow"
          to="/request-password-reset"
        >
          비밀번호를 잊으셨나요?
        </Link>
        <span className="text-pixel-yellow/50">|</span>
        <Link
          className="font-bold uppercase text-pixel-blue hover:text-pixel-yellow"
          to="/register"
        >
          회원가입
        </Link>
      </div>
    </FormContainer>
  );
}
