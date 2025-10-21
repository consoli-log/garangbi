import httpClient from './httpClient';
import { LoginDto, RegisterDto, User, ResetPasswordDto } from '@garangbi/types';

export const register = async (data: RegisterDto) => {
  return httpClient.post('/auth/register', data);
};

export const login = async (data: LoginDto) => {
  const response = await httpClient.post<{ accessToken: string }>('/auth/login', data);
  return response.data;
};

export const getMe = async (token: string): Promise<User> => {
  const response = await httpClient.get<User>('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const verifyEmail = async (token: string) => {
  const response = await httpClient.get(`/auth/verify-email?token=${token}`);
  return response.data;
};

export const requestPasswordReset = async (email: string) => {
  return httpClient.post('/auth/request-password-reset', { email });
};

export const resetPassword = async (data: ResetPasswordDto) => {
  return httpClient.post('/auth/reset-password', data);
};

export const checkEmailAvailability = async (email: string) => {
  const response = await httpClient.get<{ available: boolean }>('/auth/check-email', {
    params: { email },
  });
  return response.data;
};

export const checkNicknameAvailability = async (nickname: string) => {
  const response = await httpClient.get<{ available: boolean }>(
    '/auth/check-nickname',
    {
      params: { nickname },
    },
  );
  return response.data;
};

export const completeSocialOnboarding = async (payload: {
  nickname: string;
  termsAgreed: boolean;
  privacyAgreed: boolean;
}) => {
  return httpClient.post('/auth/social-onboarding', payload);
};
