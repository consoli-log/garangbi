import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

type ReauthModalProps = {
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onVerify: (password: string) => Promise<void>;
  onLogout?: () => void;
};

export function ReauthModal({
  open,
  isSubmitting,
  errorMessage,
  onVerify,
  onLogout,
}: ReauthModalProps) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    await onVerify(password);
  };

  return (
    <Overlay>
      <ModalCard>
        <Title>보안 확인</Title>
        <Description>마이페이지에 접근하려면 현재 비밀번호를 입력해주세요.</Description>
        <form onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="현재 비밀번호"
            required
            autoFocus
          />
          {errorMessage ? <ErrorText>{errorMessage}</ErrorText> : null}
          <Actions>
            {onLogout ? (
              <SecondaryButton type="button" onClick={onLogout}>
                로그아웃
              </SecondaryButton>
            ) : null}
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? '확인 중...' : '확인'}
            </PrimaryButton>
          </Actions>
        </form>
      </ModalCard>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalCard = styled.div`
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.24);
  width: min(420px, 90%);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
`;

const Description = styled.p`
  margin: 0;
  color: #4b5563;
  font-size: 0.95rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

const ErrorText = styled.p`
  margin: 0;
  color: #dc2626;
  font-size: 0.9rem;
`;

const Actions = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const PrimaryButton = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #0b5ed7;
  }

  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: #1f2937;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e2e8f0;
  }
`;
