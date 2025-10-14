import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { EmailVerificationNoticePage } from './pages/auth/EmailVerificationNoticePage';
import { EmailVerificationPage } from './pages/auth/EmailVerificationPage';
import { RequestPasswordResetPage } from './pages/auth/RequestPasswordResetPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SocialCallbackPage } from './pages/auth/SocialCallbackPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';
import { useAuthStore } from '@stores/authStore';
import { MyPage } from './pages/mypage/MyPage';
import { InvitationAcceptPage } from './pages/invitations/InvitationAcceptPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LedgerManagementPage } from './pages/ledger/LedgerManagementPage';

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="ledgers/manage" element={<LedgerManagementPage />} />
        </Route>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/email-notice" element={<EmailVerificationNoticePage />}/>
        <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
        <Route path="/request-password-reset" element={<RequestPasswordResetPage />}/>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/social-callback" element={<SocialCallbackPage />} />
        <Route path="/invitations/accept" element={<InvitationAcceptPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
