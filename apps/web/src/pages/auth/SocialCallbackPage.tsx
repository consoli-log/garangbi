import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@stores/authStore';
import { notificationService } from '@services/index';
import { FormContainer } from '../../components/common/FormControls';

export function SocialCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuthStore();
  const processing = useRef(false);

  useEffect(() => {
    if (processing.current) {
      return;
    }

    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      notificationService.error('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
      navigate('/login');
      return;
    }

    if (token) {
      processing.current = true;
      const loginAndRedirect = async () => {
        try {
          setToken(token, true);
          const user = await fetchUser(token);
          if (user.onboardingCompleted) {
            navigate('/');
          } else {
            navigate('/auth/social-onboarding', { replace: true });
          }
        } catch (e) {
          notificationService.error('사용자 정보를 가져오는데 실패했습니다.');
          navigate('/login');
        }
      };
      void loginAndRedirect();
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setToken, fetchUser]);

  return (
    <FormContainer className="text-center">
      <p className="text-sm text-pixel-ink/75">로그인 처리 중입니다...</p>
    </FormContainer>
  );
}
