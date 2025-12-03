import type {
  EmailCheckResponseData,
  EmailSignupRequest,
  EmailSignupResponseData,
  LoginRequest,
  LoginResponseData,
  VerifyEmailRequest,
  VerifyEmailResponseData,
} from '@zzogaebook/types';
import { apiPost } from './http';

export function emailSignup(payload: EmailSignupRequest): Promise<EmailSignupResponseData> {
  return apiPost<EmailSignupResponseData>('/auth/email-signup', payload);
}

export function checkEmailAvailability(email: string): Promise<EmailCheckResponseData> {
  return apiPost<EmailCheckResponseData>('/auth/email-check', { email });
}

export function verifyEmail(payload: VerifyEmailRequest): Promise<VerifyEmailResponseData> {
  return apiPost<VerifyEmailResponseData>('/auth/verify-email', payload);
}

export function login(payload: LoginRequest): Promise<LoginResponseData> {
  return apiPost<LoginResponseData>('/auth/login', payload);
}
