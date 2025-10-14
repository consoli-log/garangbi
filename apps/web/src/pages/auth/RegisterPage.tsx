import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService, notificationService } from '@services/index';
import { useNavigate } from 'react-router-dom';
import { RegisterSchema } from '@garangbi/types';
import { FormContainer, Form, InputGroup, Input, Button, ErrorMessage } from '../../components/common/FormControls';
import styled from 'styled-components';

const registerPageSchema = RegisterSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerPageSchema>;

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'error';

const getPasswordStrength = (password: string) => {
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
      <h1>회원가입</h1>
      <Form onSubmit={handleSubmit(onSubmit)}>
        <InputGroup>
          <label>이메일</label>
          <Input
            {...formRegister('email', {
              onBlur: (event) => checkEmailAvailability(event.target.value.trim()),
            })}
          />
          {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          <AvailabilityHint status={emailStatus}>
            {emailStatus === 'available' && '사용 가능한 이메일입니다.'}
            {emailStatus === 'unavailable' && '이미 사용 중인 이메일입니다.'}
            {emailStatus === 'checking' && '이메일 중복 여부를 확인하고 있습니다...'}
            {emailStatus === 'error' && '이메일 중복 확인에 실패했습니다.'}
          </AvailabilityHint>
        </InputGroup>
        <InputGroup>
          <label>닉네임</label>
          <Input
            {...formRegister('nickname', {
              onBlur: (event) => checkNicknameAvailability(event.target.value.trim()),
            })}
          />
          {errors.nickname && (
            <ErrorMessage>{errors.nickname.message}</ErrorMessage>
          )}
          <AvailabilityHint status={nicknameStatus}>
            {nicknameStatus === 'available' && '사용 가능한 닉네임입니다.'}
            {nicknameStatus === 'unavailable' && '이미 사용 중인 닉네임입니다.'}
            {nicknameStatus === 'checking' && '닉네임 중복 여부를 확인하고 있습니다...'}
            {nicknameStatus === 'error' && '닉네임 중복 확인에 실패했습니다.'}
          </AvailabilityHint>
        </InputGroup>
        <InputGroup>
          <label>비밀번호</label>
          <Input type="password" {...formRegister('password')} />
          {errors.password && (
            <ErrorMessage>{errors.password.message}</ErrorMessage>
          )}
          {passwordStrength && (
            <PasswordStrength $strength={passwordStrength}>
              {passwordStrength === 'weak' && '안전도: 약함'}
              {passwordStrength === 'medium' && '안전도: 보통'}
              {passwordStrength === 'strong' && '안전도: 강함'}
            </PasswordStrength>
          )}
        </InputGroup>
        <InputGroup>
          <label>비밀번호 확인</label>
          <Input type="password" {...formRegister('confirmPassword')} />
          {errors.confirmPassword && (
            <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>
          )}
        </InputGroup>
        <CheckboxGroup>
          <CheckboxLabel>
            <input type="checkbox" {...formRegister('termsAgreed')} />
            <span>서비스 이용약관에 동의합니다.</span>
          </CheckboxLabel>
          {errors.termsAgreed && (
            <ErrorMessage>{errors.termsAgreed.message}</ErrorMessage>
          )}
        </CheckboxGroup>
        <CheckboxGroup>
          <CheckboxLabel>
            <input type="checkbox" {...formRegister('privacyAgreed')} />
            <span>개인정보 처리방침에 동의합니다.</span>
          </CheckboxLabel>
          {errors.privacyAgreed && (
            <ErrorMessage>{errors.privacyAgreed.message}</ErrorMessage>
          )}
        </CheckboxGroup>
        <Button type="submit">가입하기</Button>
      </Form>
    </FormContainer>
  );
}

const AvailabilityHint = styled.p<{ status: AvailabilityStatus }>`
  font-size: 0.875rem;
  margin: 0;
  color: ${({ status }) => {
    switch (status) {
      case 'available':
        return '#198754';
      case 'unavailable':
      case 'error':
        return '#dc3545';
      case 'checking':
        return '#0d6efd';
      default:
        return 'transparent';
    }
  }};
  height: 1.25rem;
`;

const PasswordStrength = styled.p<{ $strength: 'weak' | 'medium' | 'strong' }>`
  font-size: 0.875rem;
  margin: 0;
  color: ${({ $strength }) => {
    if ($strength === 'strong') return '#198754';
    if ($strength === 'medium') return '#ffc107';
    return '#dc3545';
  }};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
  }
`;
