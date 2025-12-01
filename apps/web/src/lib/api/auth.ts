import type { EmailCheckResponseData, EmailSignupRequest, EmailSignupResponseData } from '@zzogaebook/types';
import { apiPost } from './http';

export function emailSignup(payload: EmailSignupRequest): Promise<EmailSignupResponseData> {
  return apiPost<EmailSignupResponseData>('/auth/email-signup', payload);
}

export function checkEmailAvailability(email: string): Promise<EmailCheckResponseData> {
  return apiPost<EmailCheckResponseData>('/auth/email-check', { email });
}
