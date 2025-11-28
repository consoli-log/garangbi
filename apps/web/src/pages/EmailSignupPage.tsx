import { EmailSignupForm } from '../components/signup/EmailSignupForm';

const checklist = [
  '이메일·닉네임·비밀번호 실시간 검사',
  '약관 / 개인정보 처리방침 동의 필수 안내',
  '가입 후 이메일 인증 안내 메시지 노출',
];

export function EmailSignupPage() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-10 text-brand-primary md:px-8 lg:px-12">
      <header className="mx-auto w-full max-w-5xl pb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-secondary/80">ACC-001</p>
        <h1 className="mt-3 text-3xl font-bold leading-snug text-brand-primary md:text-4xl">
          이메일 회원가입으로
          <br />
          쪼개부기를 시작해 보세요
        </h1>
        <p className="mt-4 text-base text-black/70 md:text-lg">
          가입 즉시 계정이 생성되고, 이메일 인증을 마치면 모든 기능을 사용할 수 있어요.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-3xl bg-white/90 p-6 shadow-card ring-2 ring-black/5 lg:flex-row lg:p-10">
        <section className="flex-1 space-y-6">
          <div className="rounded-2xl border-2 border-black bg-gradient-to-br from-white to-purple-50 p-6">
            <p className="text-sm font-semibold text-black/60">가입 체크리스트</p>
            <ul className="mt-4 space-y-3 text-base font-medium">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-brand-secondary" />
                  <span className="text-black/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-black/50 bg-white/80 p-6 text-sm leading-relaxed text-black/70">
            <p className="font-semibold text-black">가입 시 안내</p>
            <ul className="mt-3 space-y-2">
              <li>· 계정은 비활성 상태로 생성되며 이메일 인증 후 활성화됩니다.</li>
              <li>· 입력한 이메일 주소로 인증 메일이 발송됩니다.</li>
              <li>· 비밀번호는 서비스 내에서 복호화되지 않는 방식으로 암호화 저장됩니다.</li>
            </ul>
          </div>
        </section>

        <section className="flex-1 rounded-2xl border-2 border-black bg-white p-6 shadow-card">
          <EmailSignupForm />
        </section>
      </main>
    </div>
  );
}
