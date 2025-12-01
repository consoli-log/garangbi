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

export interface EmailCheckResponseData {
  valid: boolean;
  message: string;
}

export type EmailCheckResponse = ApiSuccess<EmailCheckResponseData>;

export interface VerifyEmailRequest {
  email: string;
  token: string;
}

export interface VerifyEmailResponseData {
  email: string;
  status: AccountStatus;
  message: string;
}

export type VerifyEmailResponse = ApiSuccess<VerifyEmailResponseData>;
