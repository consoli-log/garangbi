import React from 'react';
import { Link } from 'react-router-dom';
import { FormContainer } from '../../components/common/FormControls';

export function EmailVerificationNoticePage() {
  return (
    <FormContainer className="gap-4 text-center">
      <h1 className="text-base font-bold uppercase tracking-widest text-pixel-yellow">
        이메일을 확인해주세요
      </h1>
      <p className="max-w-md text-[11px] text-pixel-yellow">
        회원가입을 완료하려면 이메일 주소로 발송된 인증 링크를 클릭해주세요.
      </p>
      <p className="max-w-md text-[11px] text-pixel-yellow">
        이메일을 받지 못하셨나요? 스팸함을 확인해보세요.
      </p>
      <Link
        className="text-[11px] font-bold uppercase text-pixel-blue hover:text-pixel-yellow"
        to="/login"
      >
        로그인 페이지로 돌아가기
      </Link>
    </FormContainer>
  );
}
