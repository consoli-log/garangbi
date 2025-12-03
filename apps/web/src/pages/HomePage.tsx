import { useAuthStore, authSelectors } from '../stores/authStore';

export function HomePage() {
  const user = useAuthStore(authSelectors.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F1FF] to-white px-4 py-12 text-brand-primary">
      <header className="mx-auto max-w-4xl rounded-3xl border-2 border-black bg-white p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-black/60">
          ZZOGAEBOOK PREVIEW
        </p>
        <h1 className="mt-3 text-4xl font-bold text-black">
          {user ? `${user.nickname}님의 자산 관리 홈` : '쪼개부기 메인'}
        </h1>
        <p className="mt-3 text-base text-black/70">
          자산, 예산, 목표 기능을 본격적으로 연결하기 전에 여기서 오늘의 현황을 확인할 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-2xl border-2 border-black bg-brand-secondary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-secondary/90"
          >
            대시보드(준비 중)
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl border-2 border-black px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-black hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border-2 border-black bg-white p-6 shadow-card lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-black/50">
            빠른 요약
          </p>
          <h2 className="mt-2 text-2xl font-bold text-black">이번 주 쪼개부기 목표</h2>
          <ul className="mt-4 space-y-3 text-sm text-black/70">
            <li>• 자산 연동 기능을 곧 연결할 예정이에요.</li>
            <li>• 예산 편집 화면은 디자인 검토 중입니다.</li>
            <li>• 메인 대시보드에서 모든 정보를 한눈에 볼 수 있게 준비 중이에요.</li>
          </ul>
        </section>

        <section className="rounded-3xl border-2 border-black bg-white p-6 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-black/50">
            다음 액션
          </p>
          <h2 className="mt-2 text-xl font-bold text-black">곧 만나볼 기능</h2>
          <div className="mt-4 space-y-2 text-sm text-black/70">
            <p>• 자산 추가 &amp; 순자산 카드</p>
            <p>• 거래 내역 입력</p>
            <p>• 목표 탭</p>
          </div>
        </section>
      </main>
    </div>
  );
}
