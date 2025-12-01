import type { EmailSignupRequest, EmailSignupResponseData } from '@zzogaebook/types';
import { apiPost } from './http';

export function emailSignup(payload: EmailSignupRequest): Promise<EmailSignupResponseData> {
  return apiPost<EmailSignupResponseData>('/auth/email-signup', payload);
}
