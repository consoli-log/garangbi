import type { EmailSignupRequest } from '@zzogaebook/types';

export type SignupField = keyof EmailSignupRequest;

export type SignupErrors = Record<SignupField, string | null>;

export const signupFields: SignupField[] = [
  'email',
  'nickname',
  'password',
  'passwordConfirm',
  'agreeTerms',
  'agreePrivacy',
];

export const initialSignupValues: EmailSignupRequest = {
  email: '',
  nickname: '',
  password: '',
  passwordConfirm: '',
  agreeTerms: false,
  agreePrivacy: false,
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nicknamePattern = /^[가-힣a-zA-Z0-9_]{2,20}$/;

export function validateSignupField(
  field: SignupField,
  value: EmailSignupRequest[SignupField],
  form: EmailSignupRequest,
): string | null {
  switch (field) {
    case 'email':
      if (!value || typeof value !== 'string') {
        return '이메일을 입력해 주세요.';
      }
      if (!emailPattern.test(value)) {
        return '올바른 이메일 형식이 아닙니다.';
      }
      return null;
    case 'nickname':
      if (!value || typeof value !== 'string') {
        return '닉네임을 입력해 주세요.';
      }
      if (!nicknamePattern.test(value)) {
        return '닉네임은 2~20자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요.';
      }
      return null;
    case 'password':
      if (!value || typeof value !== 'string') {
        return '비밀번호를 입력해 주세요.';
      }
      if (value.length < 8) {
        return '비밀번호는 8자 이상이어야 합니다.';
      }
      if (!/[0-9]/.test(value) || !/[A-Za-z]/.test(value)) {
        return '영문과 숫자를 조합해 주세요.';
      }
      return null;
    case 'passwordConfirm':
      if (!value || typeof value !== 'string') {
        return '비밀번호를 한 번 더 입력해 주세요.';
      }
      if (value !== form.password) {
        return '비밀번호가 일치하지 않습니다.';
      }
      return null;
    case 'agreeTerms':
      return value ? null : '서비스 이용 약관 동의는 필수입니다.';
    case 'agreePrivacy':
      return value ? null : '개인정보 처리방침 동의는 필수입니다.';
    default:
      return null;
  }
}

export function validateSignupForm(form: EmailSignupRequest): SignupErrors {
  return signupFields.reduce<SignupErrors>((acc, field) => {
    acc[field] = validateSignupField(field, form[field], form);
    return acc;
  }, {} as SignupErrors);
}

export function isSignupFormValid(errors: SignupErrors): boolean {
  return signupFields.every((field) => !errors[field]);
}
