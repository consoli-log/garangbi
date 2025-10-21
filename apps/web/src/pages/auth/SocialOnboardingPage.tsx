import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FormContainer,
  Form,
  InputGroup,
  Input,
  Button,
  ErrorMessage,
} from '../../components/common/FormControls';
import { notificationService, usersService } from '@services/index';
import { useAuthStore } from '@stores/authStore';
import { useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@garangbi/types';

const onboardingSchema = z.object({
  nickname: RegisterSchema.shape.nickname,
  termsAgreed: RegisterSchema.shape.termsAgreed,
  privacyAgreed: RegisterSchema.shape.privacyAgreed,
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function SocialOnboardingPage() {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: user?.nickname ?? '',
      termsAgreed: false,
      privacyAgreed: false,
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.onboardingCompleted) {
      navigate('/', { replace: true });
    } else {
      setValue('nickname', user.nickname ?? '');
    }
  }, [user, navigate, setValue]);

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      await usersService.completeSocialOnboarding(data);
      await fetchUser();
      notificationService.success('온보딩이 완료되었습니다. 가랑비를 시작해볼까요?');
      navigate('/', { replace: true });
    } catch (error) {
      // 에러 토스트는 인터셉터가 처리합니다.
    }
  };

  return (
    <FormContainer>
      <h1 className="mb-4 pixel-heading text-3xl">가랑비 시작하기</h1>
      <p className="mb-6 max-w-lg text-center text-sm text-pixel-ink/75">
        계정 사용을 위해 닉네임을 설정하고 이용 약관에 동의해주세요.
      </p>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label className="text-sm font-bold uppercase text-pixel-ink" htmlFor="nickname">
            닉네임
          </label>
          <Input id="nickname" {...register('nickname')} />
          {errors.nickname ? <ErrorMessage>{errors.nickname.message}</ErrorMessage> : null}
        </InputGroup>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 text-sm text-pixel-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded-[10px] border-[3px] border-black bg-white text-pixel-ink focus:outline-none focus:ring-0"
              {...register('termsAgreed')}
            />
            <span>
              <strong className="font-semibold">서비스 이용약관</strong>에 동의합니다.
            </span>
          </label>
          {errors.termsAgreed ? <ErrorMessage>{errors.termsAgreed.message}</ErrorMessage> : null}
          <label className="flex items-start gap-3 text-sm text-pixel-ink">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded-[10px] border-[3px] border-black bg-white text-pixel-ink focus:outline-none focus:ring-0"
              {...register('privacyAgreed')}
            />
            <span>
              <strong className="font-semibold">개인정보 처리방침</strong>에 동의합니다.
            </span>
          </label>
          {errors.privacyAgreed ? <ErrorMessage>{errors.privacyAgreed.message}</ErrorMessage> : null}
        </div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '완료 중...' : '동의하고 시작하기'}
        </Button>
      </Form>
    </FormContainer>
  );
}
