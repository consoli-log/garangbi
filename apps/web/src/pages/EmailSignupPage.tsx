import { EmailSignupForm } from '../components/signup/EmailSignupForm';

export function EmailSignupPage() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-10 text-brand-primary md:px-8 lg:px-12">
      <header className="mx-auto w-full max-w-2xl pb-8 text-center">
        <h1 className="text-3xl font-bold leading-snug text-brand-primary md:text-4xl">
          이메일 회원가입으로
          <br />
          쪼개부기를 시작해 보세요
        </h1>
        <p className="mt-4 text-base text-black/70 md:text-lg">
          기본 정보를 입력하고 이메일 인증을 완료하면 바로 서비스를 이용할 수 있어요.
        </p>
      </header>

      <main className="mx-auto w-full max-w-2xl rounded-3xl border-2 border-black bg-white p-6 shadow-card ring-2 ring-black/5 md:p-10">
        <EmailSignupForm />
        <p className="mt-6 text-center text-xs text-black/60">
          이미 계정이 있다면{' '}
          <a href="/login" className="font-semibold text-brand-secondary underline">
            로그인
          </a>
          으로 이동해 주세요.
        </p>
      </main>
    </div>
  );
}
