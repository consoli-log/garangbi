import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { cn } from '../../lib/cn';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore((state) => ({
    user: state.user,
    logout: state.logout,
  }));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = (isActive: boolean) =>
    cn(
      'rounded-[18px] border-4 border-black bg-white px-5 py-3 text-sm font-semibold uppercase tracking-wider text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
      isActive && 'bg-pixel-blue text-white',
    );

  return (
    <div className="min-h-screen bg-pixel-dark text-pixel-ink">
      <header className="sticky top-0 z-40 border-b-4 border-black bg-white/90 px-6 py-4 shadow-pixel-md backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-[22px] border-4 border-black bg-pixel-yellow px-6 py-3 text-sm font-extrabold uppercase tracking-[0.3em] text-pixel-ink shadow-pixel-md transition-transform duration-200 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:shadow-pixel-lg"
            >
              Garanbi Pixel Budget
            </button>
          </div>

          <nav className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <NavLink to="/" end className={({ isActive }) => navLinkClass(Boolean(isActive))}>
              대시보드
            </NavLink>
            <NavLink to="/mypage" className={({ isActive }) => navLinkClass(Boolean(isActive))}>
              마이페이지
            </NavLink>
            <NavLink
              to="/ledgers/manage"
              className={({ isActive }) => navLinkClass(Boolean(isActive))}
            >
              가계부 구성
            </NavLink>
          </nav>

          <div className="flex flex-col gap-2 text-sm font-semibold uppercase text-pixel-ink md:flex-row md:items-center md:gap-4">
            {user ? <span className="text-xs text-pixel-ink/60">{user.nickname ?? user.email}</span> : null}
            <button
              type="button"
              onClick={handleLogout}
              className="pixel-button bg-pixel-red text-white hover:text-white"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
