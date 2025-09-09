import { Routes, Route, Link } from 'react-router-dom';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { useThemeStore } from './stores/theme';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './lib/zod-ko';

const Global = createGlobalStyle`
  body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto}
  a{color:inherit}
`;

const light = { bg: '#f6f7f9', fg: '#111', card: '#fff' };
const dark  = { bg: '#0f1115', fg: '#f1f5f9', card: '#141820' };

const Shell = styled.div`
  min-height:100vh; background:${p=>p.theme.bg}; color:${p=>p.theme.fg};
`;
const Container = styled.div`max-width:960px; margin:0 auto; padding:20px;`;
const Card = styled.div`
  background:${p=>p.theme.card}; padding:20px; border-radius:14px; margin-top:20px;
  box-shadow:0 4px 24px rgba(0,0,0,.08);
`;

function Home() {
  return (
    <Card>
      <h2>가랑비 대시보드 (초기)</h2>
      <p>로그인 성공! 좌측 상단 <Link to="/">가랑비</Link>를 눌러 언제든 홈으로 돌아올 수 있어요.</p>
    </Card>
  );
}

import LoginPage from './pages/auth/Login';
import RegisterPage from './pages/auth/Register';
import AssetsPage from "./pages/assets/AssetsPage";

export default function App() {
  const mode = useThemeStore(s => s.mode);
  const hydrate = useAuthStore(s=>s.hydrate);

  useEffect(()=>{ hydrate(); }, [hydrate]);

  return (
    <ThemeProvider theme={mode === 'dark' ? dark : light}>
      <Global />
      <Shell>
        <Header />
        <Container>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home/></ProtectedRoute>} />
            <Route path="/auth/login" element={<LoginPage/>} />
            <Route path="/auth/register" element={<RegisterPage/>} />
            <Route path="/assets" element={<AssetsPage />} />
          </Routes>
        </Container>
        <ToastContainer position="top-right" autoClose={2000} newestOnTop />
      </Shell>
    </ThemeProvider>
  );
}
