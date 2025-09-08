import { Routes, Route, Link } from 'react-router-dom';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { useThemeStore } from './stores/theme';

const Global = createGlobalStyle`
  body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto}
`;

const light = { bg: '#f6f7f9', fg: '#111', card: '#fff' };
const dark  = { bg: '#0f1115', fg: '#f1f5f9', card: '#141820' };

const Shell = styled.div`
  min-height:100vh; background:${p=>p.theme.bg}; color:${p=>p.theme.fg};
`;
const Card = styled.div`
  background:${p=>p.theme.card}; padding:20px; border-radius:14px; max-width:720px; margin:40px auto;
  box-shadow:0 4px 24px rgba(0,0,0,.08);
`;

function Home() {
  return (
    <Card>
      <h2>가랑비 대시보드 (초기)</h2>
      <p>스캐폴드 확인용 기본 화면입니다.</p>
      <p><Link to="/auth">로그인/회원가입</Link></p>
    </Card>
  );
}
function Auth() {
  return (
    <Card>
      <h3>Auth Placeholder</h3>
      <p>/auth/register, /auth/login API 연결 예정</p>
    </Card>
  );
}

export default function App() {
  const mode = useThemeStore(s => s.mode);
  return (
    <ThemeProvider theme={mode === 'dark' ? dark : light}>
      <Global />
      <Shell>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/auth" element={<Auth/>}/>
        </Routes>
      </Shell>
    </ThemeProvider>
  );
}
