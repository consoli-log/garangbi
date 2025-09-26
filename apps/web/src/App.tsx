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

function App() {
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
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/email-notice" element={<EmailVerificationNoticePage />}/>
        <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
        <Route path="/request-password-reset" element={<RequestPasswordResetPage />}/>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/social-callback" element={<SocialCallbackPage />} />
        <Route path="/" element={<div>메인 페이지</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;