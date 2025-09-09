import styled from 'styled-components';
import { useAuthStore } from '../stores/auth';
import { Link, useNavigate } from 'react-router-dom';

const Bar = styled.header`
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 20px; background:${p=>p.theme.card}; border-bottom:1px solid rgba(0,0,0,.06);
`;
const Brand = styled(Link)`font-weight:700; text-decoration:none; color:inherit;`;
const Right = styled.div`display:flex; gap:12px; align-items:center;`;
const Button = styled.button`
  padding:8px 12px; border-radius:10px; border:1px solid rgba(0,0,0,.1); background:transparent; color:inherit; cursor:pointer;
`;

export default function Header() {
  const user = useAuthStore(s=>s.user);
  const logout = useAuthStore(s=>s.logout);
  const nav = useNavigate();
  return (
    <Bar>
      <Brand to="/">가랑비</Brand>
      <Right>
        {user ? (
          <>
            <span>{user.nickname} 님</span>
            <Button onClick={() => { logout(); nav('/auth/login'); }}>로그아웃</Button>
          </>
        ) : (
          <>
            <Button onClick={() => nav('/auth/login')}>로그인</Button>
            <Button onClick={() => nav('/auth/register')}>회원가입</Button>
          </>
        )}
      </Right>
    </Bar>
  );
}