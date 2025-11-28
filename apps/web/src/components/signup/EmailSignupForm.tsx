import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { EmailSignupRequest, EmailSignupResponseData } from '@zzogaebook/types';
import { emailSignup } from '../../lib/api/auth';
import { ApiClientError } from '../../lib/api/http';
import {
  initialSignupValues,
  isSignupFormValid,
  signupFields,
  validateSignupField,
  validateSignupForm,
} from '../../lib/validation/signupValidation';
import type { SignupErrors } from '../../lib/validation/signupValidation';
import { cn } from '../../lib/utils';

type TouchedState = Record<keyof EmailSignupRequest, boolean>;

const createInitialTouched = (): TouchedState =>
  signupFields.reduce<TouchedState>(
    (acc, field) => ({
      ...acc,
      [field]: false,
    }),
    {} as TouchedState,
  );

const createAllTouched = (): TouchedState =>
  signupFields.reduce<TouchedState>(
    (acc, field) => ({
      ...acc,
      [field]: true,
    }),
    {} as TouchedState,
  );

export function EmailSignupForm() {
  const [form, setForm] = useState<EmailSignupRequest>(initialSignupValues);
  const [touched, setTouched] = useState<TouchedState>(() => createInitialTouched());
  const [errors, setErrors] = useState<SignupErrors>(() => validateSignupForm(initialSignupValues));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successPayload, setSuccessPayload] = useState<EmailSignupResponseData | null>(null);

  const isValid = useMemo(() => isSignupFormValid(errors), [errors]);

  const updateField = (field: keyof EmailSignupRequest, value: string | boolean) => {
    if (successPayload) {
      setSuccessPayload(null);
    }
    if (serverError) {
      setServerError(null);
    }

    setForm((prev) => {
      const nextForm = { ...prev, [field]: value } as EmailSignupRequest;
      setErrors((prevErrors) => {
        const nextErrors: SignupErrors = {
          ...prevErrors,
          [field]: validateSignupField(field, nextForm[field], nextForm),
        };

        if (field === 'password' && touched.passwordConfirm) {
          nextErrors.passwordConfirm = validateSignupField('passwordConfirm', nextForm.passwordConfirm, nextForm);
        }

        if (field === 'passwordConfirm') {
          nextErrors.passwordConfirm = validateSignupField('passwordConfirm', nextForm.passwordConfirm, nextForm);
        }

        return nextErrors;
      });
      return nextForm;
    });

    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateSignupForm(form);
    setErrors(validation);
    setTouched(createAllTouched());

    if (!isSignupFormValid(validation)) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = await emailSignup(form);
      setSuccessPayload(payload);
      setForm(initialSignupValues);
      setTouched(createInitialTouched());
      setErrors(validateSignupForm(initialSignupValues));
    } catch (error) {
      setSuccessPayload(null);
      if (error instanceof ApiClientError) {
        const message = error.response?.error.message;
        setServerError(Array.isArray(message) ? message.join(', ') : message ?? error.message);
      } else {
        setServerError('요청 중 문제가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldHasError = (field: keyof EmailSignupRequest) => touched[field] && Boolean(errors[field]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <h2 className="text-2xl font-semibold text-black">이메일 회원가입</h2>
        <p className="mt-1 text-sm text-black/60">정보를 입력하고 인증 메일을 확인해 주세요.</p>
      </div>

      {successPayload && (
        <div className="rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">이메일을 확인해 주세요</p>
          <p className="mt-1">
            {successPayload.email} 주소로 인증 링크를 보냈어요. {successPayload.message}
          </p>
        </div>
      )}

      {serverError && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-black">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={cn(
              'mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30',
              fieldHasError('email') ? 'border-red-500' : 'border-black/60',
            )}
            placeholder="name@example.com"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            onBlur={() => updateField('email', form.email)}
          />
          {fieldHasError('email') && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="nickname" className="text-sm font-semibold text-black">
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            className={cn(
              'mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30',
              fieldHasError('nickname') ? 'border-red-500' : 'border-black/60',
            )}
            placeholder="ex) 쪼개부기러버"
            value={form.nickname}
            onChange={(event) => updateField('nickname', event.target.value)}
            onBlur={() => updateField('nickname', form.nickname)}
          />
          {fieldHasError('nickname') ? (
            <p className="mt-1 text-sm text-red-600">{errors.nickname}</p>
          ) : (
            <p className="mt-1 text-xs text-black/50">2~20자, 한글/영문/숫자 사용 가능</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-semibold text-black">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={cn(
              'mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30',
              fieldHasError('password') ? 'border-red-500' : 'border-black/60',
            )}
            placeholder="영문+숫자 8자 이상"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            onBlur={() => updateField('password', form.password)}
          />
          {fieldHasError('password') ? (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          ) : (
            <p className="mt-1 text-xs text-black/50">영문과 숫자를 조합해 주세요.</p>
          )}
        </div>

        <div>
          <label htmlFor="passwordConfirm" className="text-sm font-semibold text-black">
            비밀번호 확인
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            className={cn(
              'mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-base font-medium text-black shadow-sm transition focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30',
              fieldHasError('passwordConfirm') ? 'border-red-500' : 'border-black/60',
            )}
            value={form.passwordConfirm}
            onChange={(event) => updateField('passwordConfirm', event.target.value)}
            onBlur={() => updateField('passwordConfirm', form.passwordConfirm)}
          />
          {fieldHasError('passwordConfirm') && (
            <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm}</p>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border-2 border-dashed border-black/40 bg-purple-50/60 p-4 text-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-2 border-black accent-brand-secondary"
            checked={form.agreeTerms}
            onChange={(event) => updateField('agreeTerms', event.target.checked)}
          />
          <span className="text-black/80">
            (필수) 서비스 이용 약관에 동의합니다.
            {fieldHasError('agreeTerms') && <span className="block text-red-600">{errors.agreeTerms}</span>}
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-2 border-black accent-brand-accent"
            checked={form.agreePrivacy}
            onChange={(event) => updateField('agreePrivacy', event.target.checked)}
          />
          <span className="text-black/80">
            (필수) 개인정보 처리방침에 동의합니다.
            {fieldHasError('agreePrivacy') && <span className="block text-red-600">{errors.agreePrivacy}</span>}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className={cn(
          'w-full rounded-2xl border-2 border-black bg-brand-secondary px-4 py-3 text-base font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/40',
          (!isValid || isSubmitting) && 'cursor-not-allowed opacity-50',
        )}
      >
        {isSubmitting ? '가입 처리 중...' : '이메일 인증 시작'}
      </button>
    </form>
  );
}
