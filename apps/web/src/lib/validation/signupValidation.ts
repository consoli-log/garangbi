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
const nicknamePattern = /^[가-힣a-zA-Z0-9_ ]{2,20}$/;
const passwordMinLength = 8;
const uppercasePattern = /[A-Z]/;
const lowercasePattern = /[a-z]/;
const digitPattern = /[0-9]/;
const specialPattern = /[^A-Za-z0-9]/;

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
        return '닉네임은 2~20자의 한글, 영문, 숫자, 밑줄, 공백을 사용할 수 있어요.';
      }
      return null;
    case 'password':
      if (!value || typeof value !== 'string') {
        return '비밀번호를 입력해 주세요.';
      }
      if (value.length < passwordMinLength) {
        return '비밀번호는 8자 이상이어야 합니다.';
      }
      if (!uppercasePattern.test(value)) {
        return '대문자를 최소 1자 포함해 주세요.';
      }
      if (!lowercasePattern.test(value)) {
        return '소문자를 최소 1자 포함해 주세요.';
      }
      if (!digitPattern.test(value)) {
        return '숫자를 최소 1자 포함해 주세요.';
      }
      if (!specialPattern.test(value)) {
        return '특수문자를 최소 1자 포함해 주세요.';
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

export const passwordRules = {
  minLength: passwordMinLength,
  hasUpper: (value: string) => uppercasePattern.test(value),
  hasLower: (value: string) => lowercasePattern.test(value),
  hasDigit: (value: string) => digitPattern.test(value),
  hasSpecial: (value: string) => specialPattern.test(value),
};
