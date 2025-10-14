import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { useAuthStore } from '@stores/authStore';
import {
  ledgerService,
  notificationService,
  usersService,
} from '@services/index';
import {
  LedgerSummary,
  LedgerInvitationSummary,
  LedgerMemberRole,
} from '@garangbi/types';

const currencyOptions = ['KRW', 'USD', 'JPY'];

const createLedgerSchema = z.object({
  name: z.string().min(1, '가계부 이름을 입력해주세요.'),
  description: z.string().optional(),
  currency: z.enum(['KRW', 'USD', 'JPY']),
  monthStartDay: z
    .number({ invalid_type_error: '정산 기준일을 입력해주세요.' })
    .min(1)
    .max(28),
});

type CreateLedgerForm = z.infer<typeof createLedgerSchema>;

const profileSchema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상이어야 합니다.')
    .max(10, '닉네임은 10자 이하이어야 합니다.')
    .regex(/^[a-zA-Z0-9가-힣]+$/, '닉네임에는 특수문자를 사용할 수 없습니다.'),
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(16, '비밀번호는 16자 이하이어야 합니다.')
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, '영문, 숫자, 특수문자를 포함해야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: '새 비밀번호가 일치하지 않습니다.',
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const invitationSchema = z.object({
  ledgerId: z.string().min(1, '가계부를 선택해주세요.'),
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  role: z.enum(['VIEWER', 'EDITOR']),
});

type InvitationForm = z.infer<typeof invitationSchema>;

export function MyPage() {
  const { user, fetchUser } = useAuthStore();
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [invitations, setInvitations] = useState<LedgerInvitationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register: createLedgerRegister,
    handleSubmit: handleCreateLedgerSubmit,
    reset: resetCreateLedger,
    formState: { errors: createLedgerErrors, isSubmitting: isCreatingLedger },
  } = useForm<CreateLedgerForm>({
    resolver: zodResolver(createLedgerSchema),
    defaultValues: {
      currency: 'KRW',
      monthStartDay: 1,
    },
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user?.nickname ?? '',
    },
  });

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const {
    register: invitationRegister,
    handleSubmit: handleInvitationSubmit,
    reset: resetInvitationForm,
    formState: { errors: invitationErrors, isSubmitting: isInvitationSubmitting },
  } = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
  });

  const editableLedgers = useMemo(
    () => ledgers.filter((ledger) => ledger.role !== 'VIEWER'),
    [ledgers],
  );

  useEffect(() => {
    resetProfileForm({ nickname: user?.nickname ?? '', currentPassword: '' });
  }, [user?.nickname, resetProfileForm]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [ledgerList, invitationList] = await Promise.all([
          ledgerService.listLedgers(),
          ledgerService.getPendingInvitations(),
        ]);
        setLedgers(ledgerList);
        setInvitations(invitationList);
      } catch (error) {
        notificationService.error('마이페이지 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const refreshLedgers = async () => {
    const ledgerList = await ledgerService.listLedgers();
    setLedgers(ledgerList);
    await fetchUser();
  };

  const onCreateLedger = async (data: CreateLedgerForm) => {
    try {
      await ledgerService.createLedger(data);
      notificationService.success('새 가계부가 생성되었습니다.');
      resetCreateLedger();
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '가계부 생성에 실패했습니다. 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const handleSetMain = async (ledgerId: string) => {
    try {
      await ledgerService.setMainLedger(ledgerId);
      notificationService.success('메인 가계부로 설정되었습니다.');
      await refreshLedgers();
    } catch (error) {
      notificationService.error('메인 가계부 설정에 실패했습니다.');
    }
  };

  const handleDeleteLedger = async (ledger: LedgerSummary) => {
    const confirmation = window.prompt(
      `가계부 "${ledger.name}"을(를) 삭제하려면 이름을 정확하게 입력해주세요.`,
    );
    if (!confirmation) {
      return;
    }

    try {
      await ledgerService.deleteLedger(ledger.id, confirmation);
      notificationService.success('가계부가 삭제되었습니다.');
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '가계부 삭제에 실패했습니다. 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const handleUpdateLedger = async (ledgerId: string, payload: Partial<CreateLedgerForm>) => {
    try {
      await ledgerService.updateLedger(ledgerId, payload);
      notificationService.success('가계부 정보가 수정되었습니다.');
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '가계부 수정에 실패했습니다. 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await usersService.updateProfile({
        nickname: data.nickname,
        currentPassword: data.currentPassword,
      });
      notificationService.success('닉네임이 변경되었습니다.');
      await fetchUser();
      resetProfileForm({ nickname: data.nickname, currentPassword: '' });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '닉네임 변경에 실패했습니다. 비밀번호 또는 닉네임을 확인해주세요.';
      notificationService.error(message);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await usersService.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      notificationService.success('비밀번호가 변경되었습니다.');
      resetPasswordForm();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.';
      notificationService.error(message);
    }
  };

  const onInvitationSubmit = async (data: InvitationForm) => {
    try {
      await ledgerService.sendInvitation(data.ledgerId, {
        email: data.email,
        role: data.role as LedgerMemberRole,
      });
      notificationService.success('초대가 발송되었습니다.');
      resetInvitationForm({ ledgerId: data.ledgerId, email: '', role: data.role });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '초대 발송에 실패했습니다. 정보를 확인해주세요.';
      notificationService.error(message);
    }
  };

  const handleRespondInvitation = async (token: string, accept: boolean) => {
    try {
      await ledgerService.respondInvitation(token, accept);
      notificationService.success(accept ? '초대를 수락했습니다.' : '초대를 거절했습니다.');
      setInvitations((prev) => prev.filter((invitation) => invitation.token !== token));
      if (accept) {
        await refreshLedgers();
      }
    } catch (error) {
      notificationService.error('초대 처리에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Section>
          <h2>마이페이지</h2>
          <p>불러오는 중...</p>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <SectionHeader>
          <h2>내 정보</h2>
        </SectionHeader>
        <InfoList>
          <li>
            <span>이메일</span>
            <strong>{user?.email}</strong>
          </li>
          <li>
            <span>닉네임</span>
            <strong>{user?.nickname}</strong>
          </li>
        </InfoList>

        <SubSection>
          <h3>닉네임 변경</h3>
          <Form onSubmit={handleProfileSubmit(onProfileSubmit)}>
            <Row>
              <label>새 닉네임</label>
              <Input type="text" {...profileRegister('nickname')} />
              {profileErrors.nickname && <ErrorText>{profileErrors.nickname.message}</ErrorText>}
            </Row>
            <Row>
              <label>현재 비밀번호</label>
              <Input type="password" {...profileRegister('currentPassword')} />
              {profileErrors.currentPassword && (
                <ErrorText>{profileErrors.currentPassword.message}</ErrorText>
              )}
            </Row>
            <Button type="submit" disabled={isProfileSubmitting}>
              {isProfileSubmitting ? '변경 중...' : '닉네임 변경'}
            </Button>
          </Form>
        </SubSection>

        <SubSection>
          <h3>비밀번호 변경</h3>
          <Form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
            <Row>
              <label>현재 비밀번호</label>
              <Input type="password" {...passwordRegister('currentPassword')} />
              {passwordErrors.currentPassword && (
                <ErrorText>{passwordErrors.currentPassword.message}</ErrorText>
              )}
            </Row>
            <Row>
              <label>새 비밀번호</label>
              <Input type="password" {...passwordRegister('newPassword')} />
              {passwordErrors.newPassword && (
                <ErrorText>{passwordErrors.newPassword.message}</ErrorText>
              )}
            </Row>
            <Row>
              <label>새 비밀번호 확인</label>
              <Input type="password" {...passwordRegister('confirmPassword')} />
              {passwordErrors.confirmPassword && (
                <ErrorText>{passwordErrors.confirmPassword.message}</ErrorText>
              )}
            </Row>
            <Button type="submit" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </Form>
        </SubSection>
      </Section>

      <Section>
        <SectionHeader>
          <h2>가계부 관리</h2>
          <span>총 {ledgers.length}개</span>
        </SectionHeader>
        <LedgerGrid>
          {ledgers.map((ledger) => (
            <LedgerCard key={ledger.id} $isMain={ledger.isMain}>
              <LedgerHeader>
                <LedgerName>{ledger.name}</LedgerName>
                <RoleBadge>{ledger.role === 'OWNER' ? '소유자' : ledger.role === 'EDITOR' ? '편집' : '읽기'}</RoleBadge>
              </LedgerHeader>
              <LedgerBody>
                <p>{ledger.description || '설명 없음'}</p>
                <LedgerMeta>
                  <span>통화: {ledger.currency}</span>
                  <span>정산 기준일: 매월 {ledger.monthStartDay}일</span>
                  <span>참여 인원: {ledger.memberCount}명</span>
                </LedgerMeta>
              </LedgerBody>
              <LedgerActions onClick={(event) => event.stopPropagation()}>
                {!ledger.isMain && (
                  <MiniButton type="button" onClick={() => handleSetMain(ledger.id)}>
                    메인으로 설정
                  </MiniButton>
                )}
                {ledger.role !== 'VIEWER' && (
                  <MiniButton
                    type="button"
                    onClick={() => {
                      const newName = window
                        .prompt('새로운 가계부 이름을 입력해주세요.', ledger.name)
                        ?.trim();
                      if (!newName || newName === ledger.name) {
                        return;
                      }
                      handleUpdateLedger(ledger.id, { name: newName });
                    }}
                  >
                    이름 변경
                  </MiniButton>
                )}
                {ledger.role === 'OWNER' && (
                  <DangerMiniButton type="button" onClick={() => handleDeleteLedger(ledger)}>
                    삭제
                  </DangerMiniButton>
                )}
              </LedgerActions>
              {ledger.isMain && <MainBadge>메인 가계부</MainBadge>}
            </LedgerCard>
          ))}
        </LedgerGrid>

        <SubSection>
          <h3>새 가계부 만들기</h3>
          <Form onSubmit={handleCreateLedgerSubmit(onCreateLedger)}>
            <Row>
              <label>가계부 이름</label>
              <Input type="text" {...createLedgerRegister('name')} />
              {createLedgerErrors.name && <ErrorText>{createLedgerErrors.name.message}</ErrorText>}
            </Row>
            <Row>
              <label>설명</label>
              <Input type="text" {...createLedgerRegister('description')} />
            </Row>
            <Row>
              <label>기본 화폐</label>
              <Select {...createLedgerRegister('currency')}>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </Select>
              {createLedgerErrors.currency && (
                <ErrorText>{createLedgerErrors.currency.message}</ErrorText>
              )}
            </Row>
            <Row>
              <label>정산 기준일</label>
              <Input
                type="number"
                min={1}
                max={28}
                {...createLedgerRegister('monthStartDay', { valueAsNumber: true })}
              />
              {createLedgerErrors.monthStartDay && (
                <ErrorText>{createLedgerErrors.monthStartDay.message}</ErrorText>
              )}
            </Row>
            <Button type="submit" disabled={isCreatingLedger}>
              {isCreatingLedger ? '생성 중...' : '가계부 만들기'}
            </Button>
          </Form>
        </SubSection>

        <SubSection>
          <h3>멤버 초대</h3>
          {editableLedgers.length === 0 ? (
            <p>초대 가능한 가계부가 없습니다. 편집 권한이 있는 가계부를 생성하거나 요청하세요.</p>
          ) : (
            <Form onSubmit={handleInvitationSubmit(onInvitationSubmit)}>
              <Row>
                <label>가계부 선택</label>
                <Select {...invitationRegister('ledgerId')}>
                  <option value="">가계부를 선택하세요</option>
                  {editableLedgers.map((ledger) => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </option>
                  ))}
                </Select>
                {invitationErrors.ledgerId && (
                  <ErrorText>{invitationErrors.ledgerId.message}</ErrorText>
                )}
              </Row>
              <Row>
                <label>이메일</label>
                <Input type="email" {...invitationRegister('email')} />
                {invitationErrors.email && <ErrorText>{invitationErrors.email.message}</ErrorText>}
              </Row>
              <Row>
                <label>권한</label>
                <Select {...invitationRegister('role')}>
                  <option value="VIEWER">읽기 전용</option>
                  <option value="EDITOR">편집 가능</option>
                </Select>
                {invitationErrors.role && <ErrorText>{invitationErrors.role.message}</ErrorText>}
              </Row>
              <Button type="submit" disabled={isInvitationSubmitting}>
                {isInvitationSubmitting ? '초대 중...' : '초대 보내기'}
              </Button>
            </Form>
          )}
        </SubSection>
      </Section>

      <Section>
        <SectionHeader>
          <h2>받은 초대</h2>
        </SectionHeader>
        {invitations.length === 0 ? (
          <p>받은 초대가 없습니다.</p>
        ) : (
          <InvitationList>
            {invitations.map((invitation) => (
              <InvitationItem key={invitation.id}>
                <div>
                  <strong>{invitation.ledger.name}</strong>
                  <p>
                    {invitation.invitedBy.nickname ?? invitation.invitedBy.email} 님이{' '}
                    {invitation.role === 'VIEWER'
                      ? '읽기 전용'
                      : invitation.role === 'EDITOR'
                      ? '편집 권한'
                      : '소유자 권한'}{' '}
                    으로 초대했습니다.
                  </p>
                </div>
                <InvitationActions>
                  <MiniButton type="button" onClick={() => handleRespondInvitation(invitation.token, true)}>
                    수락
                  </MiniButton>
                  <DangerMiniButton type="button" onClick={() => handleRespondInvitation(invitation.token, false)}>
                    거절
                  </DangerMiniButton>
                </InvitationActions>
              </InvitationItem>
            ))}
          </InvitationList>
        )}
      </Section>
    </Container>
  );
}

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const Section = styled.section`
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);

  h2 {
    margin: 0 0 16px;
  }

  h3 {
    margin: 0 0 12px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  span {
    color: #6c757d;
  }
`;

const SubSection = styled.div`
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f1f3f5;
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;

  li {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  span {
    color: #6c757d;
    font-size: 0.875rem;
  }

  strong {
    font-size: 1.1rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #0d6efd;
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 1rem;
`;

const Button = styled.button`
  align-self: flex-start;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #0b5ed7;
  }

  &:disabled {
    background: #adb5bd;
    cursor: not-allowed;
  }
`;

const LedgerGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`;

const LedgerCard = styled.div<{ $isMain: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid ${({ $isMain }) => ($isMain ? '#0d6efd' : '#e9ecef')};
  background: #ffffff;
  box-shadow: ${({ $isMain }) =>
    $isMain ? '0 12px 24px rgba(13, 110, 253, 0.15)' : '0 6px 16px rgba(15, 23, 42, 0.08)'};
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  }
`;

const LedgerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LedgerName = styled.h4`
  margin: 0;
  font-size: 1.1rem;
`;

const LedgerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  p {
    margin: 0;
    color: #495057;
  }
`;

const LedgerMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9rem;
  color: #6c757d;
`;

const LedgerActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  flex-wrap: wrap;
`;

const MiniButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: #f1f3f5;
  color: #343a40;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;

  &:hover {
    background: #e9ecef;
  }
`;

const DangerMiniButton = styled(MiniButton)`
  background: #ffe3e3;
  color: #c92a2a;

  &:hover {
    background: #ffc9c9;
  }
`;

const RoleBadge = styled.span`
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: #e7f1ff;
  color: #0d6efd;
  font-weight: 600;
`;

const MainBadge = styled.span`
  position: absolute;
  top: 12px;
  right: 12px;
  background: #0d6efd;
  color: #ffffff;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
`;

const InvitationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InvitationItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  background: #ffffff;

  p {
    margin: 4px 0 0;
    color: #6c757d;
  }
`;

const InvitationActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ErrorText = styled.span`
  color: #c92a2a;
  font-size: 0.8rem;
`;
