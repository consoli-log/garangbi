import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuthStore } from '@stores/authStore';

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

  return (
    <LayoutContainer>
      <Header>
        <Brand onClick={() => navigate('/')}>Garangbi</Brand>
        <Nav>
          <StyledNavLink to="/" end>
            대시보드
          </StyledNavLink>
          <StyledNavLink to="/mypage">마이페이지</StyledNavLink>
          <StyledNavLink to="/ledgers/manage">가계부 구성</StyledNavLink>
        </Nav>
        <UserMenu>
          {user ? <span>{user.nickname ?? user.email}</span> : null}
          <LogoutButton type="button" onClick={handleLogout}>
            로그아웃
          </LogoutButton>
        </UserMenu>
      </Header>
      <Content>
        <Outlet />
      </Content>
    </LayoutContainer>
  );
}

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f6fa;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
`;

const Brand = styled.button`
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0d6efd;
  cursor: pointer;

  &:hover {
    color: #0b5ed7;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 16px;
`;

const StyledNavLink = styled(NavLink)`
  font-size: 0.95rem;
  font-weight: 600;
  color: #495057;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 8px;

  &.active {
    color: #0d6efd;
    background: rgba(13, 110, 253, 0.1);
  }

  &:hover {
    color: #0d6efd;
  }
`;

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.9rem;
  color: #343a40;
`;

const LogoutButton = styled.button`
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: #ffe3e3;
  color: #c92a2a;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #ffc9c9;
  }
`;

const Content = styled.main`
  flex: 1;
  padding: 32px;
`;
