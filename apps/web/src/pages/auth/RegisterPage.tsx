import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService, notificationService } from '@services/index';
import { useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@garangbi/types';
import {
  FormContainer,
  Form,
  InputGroup,
  Input,
  Button,
  ErrorMessage,
} from '../../components/common/FormControls';
import { cn } from '../../lib/cn';

const registerPageSchema = RegisterSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerPageSchema>;

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
const STATUS_CLASS_MAP: Record<AvailabilityStatus, string> = {
  idle: 'text-transparent',
  checking: 'text-pixel-blue',
  available: 'text-pixel-green',
  unavailable: 'text-pixel-red',
  error: 'text-pixel-red',
};

type PasswordStrength = 'weak' | 'medium' | 'strong';
const STRENGTH_CLASS_MAP: Record<PasswordStrength, string> = {
  weak: 'text-pixel-red',
  medium: 'text-pixel-yellow',
  strong: 'text-pixel-green',
};
const STRENGTH_FILL_CLASS: Record<PasswordStrength, string> = {
  weak: 'bg-pixel-red',
  medium: 'bg-pixel-yellow',
  strong: 'bg-pixel-green',
};
const STRENGTH_LABEL_MAP: Record<PasswordStrength, string> = {
  weak: '약함',
  medium: '보통',
  strong: '강함',
};

type AvailabilityStatusMessageProps = {
  status: AvailabilityStatus;
  availableText: string;
  unavailableText: string;
  errorText: string;
  checkingText?: string;
};

const getPasswordStrength = (password: string): PasswordStrength | null => {
  if (!password) {
    return null;
  }

  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[\W_]/.test(password)) score += 1;

  if (score >= 3) return 'strong';
  if (score === 2) return 'medium';
  return 'weak';
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [emailStatus, setEmailStatus] = useState<AvailabilityStatus>('idle');
  const [nicknameStatus, setNicknameStatus] = useState<AvailabilityStatus>('idle');
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string>('');
  const [lastCheckedNickname, setLastCheckedNickname] = useState<string>('');

  const {
    register: formRegister,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerPageSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      termsAgreed: false,
      privacyAgreed: false,
    },
  });

  const passwordValue = watch('password');
  const emailValue = watch('email');
  const nicknameValue = watch('nickname');

  useEffect(() => {
    if (emailValue !== lastCheckedEmail) {
      setEmailStatus('idle');
    }
  }, [emailValue, lastCheckedEmail]);

  useEffect(() => {
    if (nicknameValue !== lastCheckedNickname) {
      setNicknameStatus('idle');
    }
  }, [nicknameValue, lastCheckedNickname]);

  const passwordStrength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  const checkEmailAvailability = useCallback(
    async (value: string) => {
      if (!value || errors.email) {
        return;
      }

      setEmailStatus('checking');
      try {
        const { available } = await authService.checkEmailAvailability(value);
        setLastCheckedEmail(value);
        if (available) {
          setEmailStatus('available');
          clearErrors('email');
        } else {
          setEmailStatus('unavailable');
          setError('email', {
            type: 'manual',
            message: '이미 사용 중인 이메일입니다.',
          });
        }
      } catch (error) {
        setEmailStatus('error');
        notificationService.error('이메일 중복 확인 중 오류가 발생했습니다.');
      }
    },
    [clearErrors, errors.email, setError],
  );

  const checkNicknameAvailability = useCallback(
    async (value: string) => {
      if (!value || errors.nickname) {
        return;
      }

      setNicknameStatus('checking');
      try {
        const { available } = await authService.checkNicknameAvailability(value);
        setLastCheckedNickname(value);
        if (available) {
          setNicknameStatus('available');
          clearErrors('nickname');
        } else {
          setNicknameStatus('unavailable');
          setError('nickname', {
            type: 'manual',
            message: '이미 사용 중인 닉네임입니다.',
          });
        }
      } catch (error) {
        setNicknameStatus('error');
        notificationService.error('닉네임 중복 확인 중 오류가 발생했습니다.');
      }
    },
    [clearErrors, errors.nickname, setError],
  );

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const { confirmPassword, ...payload } = data;
      await authService.register(payload);
      notificationService.success('인증 메일이 발송되었습니다. 이메일을 확인해주세요.');
      navigate('/auth/email-notice');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  return (
    <FormContainer>
      <h1 className="mb-6 text-base font-bold uppercase tracking-widest text-pixel-yellow">
        회원가입
      </h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            이메일
          </label>
          <Input
            aria-invalid={Boolean(errors.email)}
            {...formRegister('email', {
              onBlur: (event) => checkEmailAvailability(event.target.value.trim()),
            })}
          />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          <AvailabilityStatusMessage
            status={emailStatus}
            availableText="사용 가능한 이메일입니다."
            unavailableText="이미 사용 중인 이메일입니다."
            errorText="이메일 중복 확인에 실패했습니다."
          />
        </InputGroup>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            닉네임
          </label>
          <Input
            aria-invalid={Boolean(errors.nickname)}
            {...formRegister('nickname', {
              onBlur: (event) => checkNicknameAvailability(event.target.value.trim()),
            })}
          />
          {errors.nickname && (
            <ErrorMessage>{errors.nickname.message}</ErrorMessage>
          )}
          <AvailabilityStatusMessage
            status={nicknameStatus}
            availableText="사용 가능한 닉네임입니다."
            unavailableText="이미 사용 중인 닉네임입니다."
            errorText="닉네임 중복 확인에 실패했습니다."
          />
        </InputGroup>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            비밀번호
          </label>
          <Input
            type="password"
            aria-invalid={Boolean(errors.password)}
            {...formRegister('password')}
          />
          {errors.password && (
            <ErrorMessage>{errors.password.message}</ErrorMessage>
          )}
          <PasswordStrengthMeter strength={passwordStrength} />
        </InputGroup>
        <InputGroup>
          <label className="text-[11px] font-bold uppercase text-pixel-yellow">
            비밀번호 확인
          </label>
          <Input
            type="password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...formRegister('confirmPassword')}
          />
          {errors.confirmPassword && (
            <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>
          )}
        </InputGroup>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-pixel-yellow">
            <input
              type="checkbox"
              className="h-4 w-4 border-4 border-black bg-[#1d1f2a] text-pixel-yellow focus:outline-none focus:ring-0"
              {...formRegister('termsAgreed')}
            />
            <span>서비스 이용약관에 동의합니다.</span>
          </label>
          {errors.termsAgreed && (
            <ErrorMessage>{errors.termsAgreed.message}</ErrorMessage>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase text-pixel-yellow">
            <input
              type="checkbox"
              className="h-4 w-4 border-4 border-black bg-[#1d1f2a] text-pixel-yellow focus:outline-none focus:ring-0"
              {...formRegister('privacyAgreed')}
            />
            <span>개인정보 처리방침에 동의합니다.</span>
          </label>
          {errors.privacyAgreed && (
            <ErrorMessage>{errors.privacyAgreed.message}</ErrorMessage>
          )}
        </div>
        <Button type="submit">가입하기</Button>
      </Form>
    </FormContainer>
  );
}
function PasswordStrengthMeter({ strength }: { strength: PasswordStrength | null }) {
  const levels: PasswordStrength[] = ['weak', 'medium', 'strong'];
  const activeIndex = strength ? levels.indexOf(strength) : -1;

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="grid flex-1 grid-cols-3 gap-1">
        {levels.map((level, index) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={level}
            className={cn(
              'h-2 border-2 border-black bg-[#1d1f2a] transition-colors',
              index <= activeIndex && STRENGTH_FILL_CLASS[level],
            )}
          />
        ))}
      </div>
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          strength ? STRENGTH_CLASS_MAP[strength] : 'text-pixel-yellow/70',
        )}
      >
        {strength ? `안전도: ${STRENGTH_LABEL_MAP[strength]}` : '비밀번호를 입력해주세요'}
      </span>
    </div>
  );
}

function AvailabilityStatusMessage({
  status,
  availableText,
  unavailableText,
  errorText,
  checkingText = '검사 중...',
}: AvailabilityStatusMessageProps) {
  return (
    <p
      className={cn(
        'min-h-[1.25rem] text-[10px] font-bold uppercase transition',
        STATUS_CLASS_MAP[status],
      )}
    >
      {status === 'available' && availableText}
      {status === 'unavailable' && unavailableText}
      {status === 'checking' && (
        <span className="inline-flex items-center gap-1 text-pixel-blue">
          <span className="h-2 w-2 animate-ping rounded-full bg-pixel-blue" />
          {checkingText}
        </span>
      )}
      {status === 'error' && errorText}
    </p>
  );
}
