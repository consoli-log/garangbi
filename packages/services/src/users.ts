import httpClient from './httpClient';
import { User } from '@garangbi/types';

export const updateProfile = async (payload: {
  nickname: string;
  currentPassword?: string;
}) => {
  const response = await httpClient.patch<User>('/users/me/profile', payload);
  return response.data;
};

export const updatePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}) => {
  return httpClient.patch('/users/me/password', payload);
};
