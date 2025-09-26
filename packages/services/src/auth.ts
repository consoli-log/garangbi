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