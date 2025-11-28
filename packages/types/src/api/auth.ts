import type { ApiSuccess } from './common';

export type AccountStatus = 'PENDING' | 'ACTIVE';

export interface EmailSignupRequest {
  email: string;
  nickname: string;
  password: string;
  passwordConfirm: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

export interface EmailSignupResponseData {
  userId: string;
  email: string;
  nickname: string;
  status: AccountStatus;
  nextStep: 'VERIFY_EMAIL';
  message: string;
}

export type EmailSignupResponse = ApiSuccess<EmailSignupResponseData>;
