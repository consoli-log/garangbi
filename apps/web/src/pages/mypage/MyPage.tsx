import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import { ReauthModal } from '../../components/mypage/ReauthModal';
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
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.').optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(16, '비밀번호는 16자 이하이어야 합니다.')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/,
        '영문, 숫자, 특수문자를 포함해야 합니다.',
      ),
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

type MyPageTab = 'profile' | 'ledgers' | 'invitations';

type SentInvitationMap = Record<string, LedgerInvitationSummary[]>;

export function MyPage() {
  const { user, fetchUser, logout } = useAuthStore();
  const requiresPassword = Boolean(user?.hasPassword);

  const [isReauthCompleted, setIsReauthCompleted] = useState(!requiresPassword);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [hasPromptedReauth, setHasPromptedReauth] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<
    LedgerInvitationSummary[]
  >([]);
  const [sentInvitationMap, setSentInvitationMap] =
    useState<SentInvitationMap>({});
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSentInvitationLoading, setIsSentInvitationLoading] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState<LedgerSummary | null>(
    null,
  );
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingLedger, setIsDeletingLedger] = useState(false);

  const {
    register: createLedgerRegister,
    handleSubmit: handleCreateLedgerSubmit,
    reset: resetCreateLedger,
    formState: {
      errors: createLedgerErrors,
      isSubmitting: isCreatingLedger,
    },
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
    setError: setProfileError,
    formState: {
      errors: profileErrors,
      isSubmitting: isProfileSubmitting,
    },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nickname: user?.nickname ?? '',
      currentPassword: '',
    },
  });

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: {
      errors: passwordErrors,
      isSubmitting: isPasswordSubmitting,
    },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const {
    register: invitationRegister,
    handleSubmit: handleInvitationSubmit,
    reset: resetInvitationForm,
    formState: {
      errors: invitationErrors,
      isSubmitting: isInvitationSubmitting,
    },
  } = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
  });

  const editableLedgers = useMemo(
    () => ledgers.filter((ledger) => ledger.role !== LedgerMemberRole.VIEWER),
    [ledgers],
  );

  const selectedLedgerInvitations =
    selectedLedgerId && sentInvitationMap[selectedLedgerId]
      ? sentInvitationMap[selectedLedgerId]
      : [];

  useEffect(() => {
    resetProfileForm({
      nickname: user?.nickname ?? '',
      currentPassword: requiresPassword ? '' : undefined,
    });
  }, [user?.nickname, requiresPassword, resetProfileForm]);

  useEffect(() => {
    if (!user) {
      setShowReauthModal(false);
      setHasPromptedReauth(false);
      setIsReauthCompleted(!requiresPassword);
      setReauthError(null);
      return;
    }

    if (requiresPassword) {
      if (!hasPromptedReauth) {
        setShowReauthModal(true);
        setIsReauthCompleted(false);
      }
    } else {
      setShowReauthModal(false);
      setHasPromptedReauth(false);
      setIsReauthCompleted(true);
      setReauthError(null);
    }
  }, [user, requiresPassword, hasPromptedReauth]);

  useEffect(() => {
    if (!showReauthModal) {
      setReauthError(null);
    }
  }, [showReauthModal]);

  const loadInitialData = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      const [ledgerList, invitationList] = await Promise.all([
        ledgerService.listLedgers(),
        ledgerService.getPendingInvitations(),
      ]);
      setLedgers(ledgerList);
      setReceivedInvitations(invitationList);
    } catch (error) {
      notificationService.error('마이페이지 정보를 불러오지 못했습니다.');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleVerifyAccess = async (password: string) => {
    try {
      setIsVerifyingPassword(true);
      setReauthError(null);
      await usersService.verifyPassword({ password });
      setIsReauthCompleted(true);
      setShowReauthModal(false);
      setHasPromptedReauth(true);
      notificationService.success('보안 인증이 완료되었습니다.');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '비밀번호 확인에 실패했습니다. 다시 시도해주세요.';
      setReauthError(message);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleForceLogout = useCallback(() => {
    logout();
    notificationService.info('다시 로그인해주세요.');
  }, [logout]);

  useEffect(() => {
    if (editableLedgers.length === 0) {
      setSelectedLedgerId('');
      return;
    }

    setSelectedLedgerId((prev) => {
      if (!prev) {
        return editableLedgers[0].id;
      }
      const stillExists = editableLedgers.some((ledger) => ledger.id === prev);
      return stillExists ? prev : editableLedgers[0].id;
    });
  }, [editableLedgers]);

  const loadLedgerInvitations = useCallback(
    async (ledgerId: string, force?: boolean) => {
      if (!ledgerId) {
        return;
      }

      if (!force && sentInvitationMap[ledgerId]) {
        return;
      }

      try {
        setIsSentInvitationLoading(true);
        const invitations = await ledgerService.getLedgerInvitations(ledgerId);
        setSentInvitationMap((prev) => ({
          ...prev,
          [ledgerId]: invitations,
        }));
      } catch (error) {
        notificationService.error('보낸 초대를 불러오지 못했습니다.');
      } finally {
        setIsSentInvitationLoading(false);
      }
    },
    [sentInvitationMap],
  );

  useEffect(() => {
    if (selectedLedgerId) {
      loadLedgerInvitations(selectedLedgerId);
    }
  }, [selectedLedgerId, loadLedgerInvitations]);

  const refreshLedgers = useCallback(async () => {
    const ledgerList = await ledgerService.listLedgers();
    setLedgers(ledgerList);
    await fetchUser();
  }, [fetchUser]);

  const onCreateLedger = async (data: CreateLedgerForm) => {
    try {
      await ledgerService.createLedger(data);
      notificationService.success('새 가계부가 생성되었습니다.');
      resetCreateLedger();
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '가계부 생성에 실패했습니다. 다시 시도해주세요.';
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

  const openDeleteLedgerDialog = (ledger: LedgerSummary) => {
    setLedgerToDelete(ledger);
    setDeleteConfirmName('');
    setDeleteError('');
  };

  const closeDeleteLedgerDialog = () => {
    setLedgerToDelete(null);
    setDeleteConfirmName('');
    setDeleteError('');
    setIsDeletingLedger(false);
  };

  const confirmDeleteLedger = async () => {
    if (!ledgerToDelete) {
      return;
    }

    if (deleteConfirmName.trim() !== ledgerToDelete.name) {
      setDeleteError('가계부 이름이 일치하지 않습니다.');
      return;
    }

    try {
      setIsDeletingLedger(true);
      await ledgerService.deleteLedger(
        ledgerToDelete.id,
        deleteConfirmName.trim(),
      );
      notificationService.success('가계부가 삭제되었습니다.');
      closeDeleteLedgerDialog();
      setSentInvitationMap((prev) => {
        const next = { ...prev };
        delete next[ledgerToDelete.id];
        return next;
      });
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '가계부 삭제에 실패했습니다. 다시 시도해주세요.';
      notificationService.error(message);
      setIsDeletingLedger(false);
    }
  };

  const handleUpdateLedger = async (
    ledgerId: string,
    payload: Partial<CreateLedgerForm>,
  ) => {
    try {
      await ledgerService.updateLedger(ledgerId, payload);
      notificationService.success('가계부 정보가 수정되었습니다.');
      await refreshLedgers();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '가계부 수정에 실패했습니다. 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    if (requiresPassword && !data.currentPassword) {
      setProfileError('currentPassword', {
        type: 'manual',
        message: '현재 비밀번호를 입력해주세요.',
      });
      return;
    }

    try {
      await usersService.updateProfile({
        nickname: data.nickname,
        ...(requiresPassword && data.currentPassword
          ? { currentPassword: data.currentPassword }
          : {}),
      });
      notificationService.success('닉네임이 변경되었습니다.');
      await fetchUser();
      resetProfileForm({
        nickname: data.nickname,
        currentPassword: requiresPassword ? '' : undefined,
      });
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
      resetInvitationForm({
        ledgerId: data.ledgerId,
        email: '',
        role: data.role,
      });
      await loadLedgerInvitations(data.ledgerId, true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        '초대 발송에 실패했습니다. 정보를 확인해주세요.';
      notificationService.error(message);
    }
  };

  const handleRespondInvitation = async (token: string, accept: boolean) => {
    try {
      await ledgerService.respondInvitation(token, accept);
      notificationService.success(
        accept ? '초대를 수락했습니다.' : '초대를 거절했습니다.',
      );
      setReceivedInvitations((prev) =>
        prev.filter((invitation) => invitation.token !== token),
      );
      if (accept) {
        await refreshLedgers();
      }
    } catch (error) {
      notificationService.error('초대 처리에 실패했습니다.');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!selectedLedgerId) {
      return;
    }

    try {
      await ledgerService.revokeInvitation(invitationId);
      notificationService.success('초대를 취소했습니다.');
      await loadLedgerInvitations(selectedLedgerId, true);
    } catch (error) {
      notificationService.error('초대 취소에 실패했습니다.');
    }
  };

  if (isInitialLoading) {
    return (
      <PageContainer>
        <PageHeading>
          <h1>마이페이지</h1>
          <p>내 정보를 불러오는 중입니다...</p>
        </PageHeading>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ReauthModal
        open={requiresPassword && showReauthModal && !isReauthCompleted}
        isSubmitting={isVerifyingPassword}
        errorMessage={reauthError}
        onVerify={handleVerifyAccess}
        onLogout={handleForceLogout}
      />
      <PageHeading>
        <h1>마이페이지</h1>
        <p>프로필과 가계부, 초대를 관리할 수 있습니다.</p>
      </PageHeading>

      <TabList>
        <TabButton
          type="button"
          $active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        >
          프로필 관리
        </TabButton>
        <TabButton
          type="button"
          $active={activeTab === 'ledgers'}
          onClick={() => setActiveTab('ledgers')}
        >
          가계부 관리
        </TabButton>
        <TabButton
          type="button"
          $active={activeTab === 'invitations'}
          onClick={() => setActiveTab('invitations')}
        >
          초대 현황
        </TabButton>
      </TabList>

      <ContentArea>
        {activeTab === 'profile' && (
          <ProfileGrid>
            <InfoCard>
              <CardHeader>
                <h2>내 정보</h2>
              </CardHeader>
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
            </InfoCard>

            <FormCard onSubmit={handleProfileSubmit(onProfileSubmit)}>
              <CardHeader>
                <h2>닉네임 변경</h2>
              </CardHeader>
              <FormRow>
                <label>새 닉네임</label>
                <TextInput type="text" {...profileRegister('nickname')} />
                {profileErrors.nickname && (
                  <ErrorText>{profileErrors.nickname.message}</ErrorText>
                )}
              </FormRow>
              {requiresPassword ? (
                <FormRow>
                  <label>현재 비밀번호</label>
                  <TextInput
                    type="password"
                    {...profileRegister('currentPassword')}
                  />
                  {profileErrors.currentPassword && (
                    <ErrorText>{profileErrors.currentPassword.message}</ErrorText>
                  )}
                </FormRow>
              ) : (
                <HelperText>
                  소셜 로그인 계정은 비밀번호 입력 없이 닉네임을 변경할 수 있습니다.
                </HelperText>
              )}
              <PrimaryButton type="submit" disabled={isProfileSubmitting}>
                {isProfileSubmitting ? '변경 중...' : '닉네임 변경'}
              </PrimaryButton>
            </FormCard>

            <FormCard onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
              <CardHeader>
                <h2>비밀번호 변경</h2>
              </CardHeader>
              <FormRow>
                <label>현재 비밀번호</label>
                <TextInput
                  type="password"
                  {...passwordRegister('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <ErrorText>
                    {passwordErrors.currentPassword.message}
                  </ErrorText>
                )}
              </FormRow>
              <FormRow>
                <label>새 비밀번호</label>
                <TextInput
                  type="password"
                  {...passwordRegister('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <ErrorText>{passwordErrors.newPassword.message}</ErrorText>
                )}
              </FormRow>
              <FormRow>
                <label>새 비밀번호 확인</label>
                <TextInput
                  type="password"
                  {...passwordRegister('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <ErrorText>
                    {passwordErrors.confirmPassword.message}
                  </ErrorText>
                )}
              </FormRow>
              <PrimaryButton type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
              </PrimaryButton>
            </FormCard>
          </ProfileGrid>
        )}

        {activeTab === 'ledgers' && (
          <LedgerSection>
            <SectionHeader>
              <h2>보유 가계부</h2>
              <span>총 {ledgers.length}개</span>
            </SectionHeader>
            {ledgers.length === 0 ? (
              <EmptyState>
                아직 생성된 가계부가 없습니다. 아래에서 새 가계부를 만들어보세요.
              </EmptyState>
            ) : (
              <LedgerGrid>
                {ledgers.map((ledger) => (
                  <LedgerCard key={ledger.id} $isMain={ledger.isMain}>
                    <LedgerCardHeader>
                      <h3>{ledger.name}</h3>
                      <RoleBadge>
                        {ledger.role === LedgerMemberRole.OWNER
                          ? '소유자'
                          : ledger.role === LedgerMemberRole.EDITOR
                          ? '편집'
                          : '읽기'}
                      </RoleBadge>
                    </LedgerCardHeader>
                    <LedgerCardBody>
                      <p>{ledger.description || '설명 없음'}</p>
                      <LedgerMeta>
                        <span>통화: {ledger.currency}</span>
                        <span>정산 기준일: 매월 {ledger.monthStartDay}일</span>
                        <span>참여 인원: {ledger.memberCount}명</span>
                      </LedgerMeta>
                    </LedgerCardBody>
                    <LedgerActions>
                      {!ledger.isMain && (
                        <MiniButton
                          type="button"
                          onClick={() => handleSetMain(ledger.id)}
                        >
                          메인 설정
                        </MiniButton>
                      )}
                      {ledger.role !== LedgerMemberRole.VIEWER && (
                        <MiniButton
                          type="button"
                          onClick={() => {
                            const newName = window
                              .prompt(
                                '새로운 가계부 이름을 입력해주세요.',
                                ledger.name,
                              )
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
                      {ledger.role === LedgerMemberRole.OWNER && (
                        <DangerMiniButton
                          type="button"
                          onClick={() => openDeleteLedgerDialog(ledger)}
                        >
                          삭제
                        </DangerMiniButton>
                      )}
                    </LedgerActions>
                    {ledger.isMain && <MainBadge>메인 가계부</MainBadge>}
                  </LedgerCard>
                ))}
              </LedgerGrid>
            )}

            <FormCard onSubmit={handleCreateLedgerSubmit(onCreateLedger)}>
              <CardHeader>
                <h2>새 가계부 만들기</h2>
              </CardHeader>
              <FormRow>
                <label>가계부 이름</label>
                <TextInput type="text" {...createLedgerRegister('name')} />
                {createLedgerErrors.name && (
                  <ErrorText>{createLedgerErrors.name.message}</ErrorText>
                )}
              </FormRow>
              <FormRow>
                <label>설명</label>
                <TextInput type="text" {...createLedgerRegister('description')} />
              </FormRow>
              <FormRow>
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
              </FormRow>
              <FormRow>
                <label>정산 기준일</label>
                <TextInput
                  type="number"
                  min={1}
                  max={28}
                  {...createLedgerRegister('monthStartDay', {
                    valueAsNumber: true,
                  })}
                />
                {createLedgerErrors.monthStartDay && (
                  <ErrorText>
                    {createLedgerErrors.monthStartDay.message}
                  </ErrorText>
                )}
              </FormRow>
              <PrimaryButton type="submit" disabled={isCreatingLedger}>
                {isCreatingLedger ? '생성 중...' : '가계부 만들기'}
              </PrimaryButton>
            </FormCard>
          </LedgerSection>
        )}

        {activeTab === 'invitations' && (
          <InvitationSection>
            <SectionHeader>
              <h2>보낸 초대</h2>
              <span>
                {selectedLedgerInvitations.length}건{' '}
                {selectedLedgerId
                  ? `(${editableLedgers.find((l) => l.id === selectedLedgerId)?.name ?? ''})`
                  : ''}
              </span>
            </SectionHeader>
            {editableLedgers.length === 0 ? (
              <EmptyState>
                초대를 보낼 수 있는 가계부가 없습니다. 가계부 소유자에게 권한을 요청하거나
                직접 생성하세요.
              </EmptyState>
            ) : (
              <>
                <FormRow>
                  <label>가계부 선택</label>
                  <Select
                    value={selectedLedgerId}
                    onChange={(event) =>
                      setSelectedLedgerId(event.target.value)
                    }
                  >
                    {editableLedgers.map((ledger) => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </Select>
                </FormRow>
                {isSentInvitationLoading ? (
                  <EmptyState>보낸 초대를 불러오는 중입니다...</EmptyState>
                ) : selectedLedgerInvitations.length === 0 ? (
                  <EmptyState>
                    선택한 가계부에서 발송한 초대가 없습니다.
                  </EmptyState>
                ) : (
                  <InvitationList>
                    {selectedLedgerInvitations.map((invitation) => (
                      <InvitationItem key={invitation.id}>
                        <div>
                          <InvitationTitle>{invitation.email}</InvitationTitle>
                          <InvitationMeta>
                            {invitation.role === LedgerMemberRole.EDITOR
                              ? '편집 권한'
                              : invitation.role === LedgerMemberRole.OWNER
                              ? '소유자 권한'
                              : '읽기 전용'}{' '}
                            초대 • 만료일{' '}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </InvitationMeta>
                        </div>
                        <DangerMiniButton
                          type="button"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                        >
                          초대 취소
                        </DangerMiniButton>
                      </InvitationItem>
                    ))}
                  </InvitationList>
                )}
              </>
            )}

            <Divider />

            <SectionHeader>
              <h2>새 초대 보내기</h2>
            </SectionHeader>
            {editableLedgers.length === 0 ? (
              <EmptyState>
                초대 가능한 가계부가 없습니다. 편집 권한이 있는 가계부를 생성하거나
                요청하세요.
              </EmptyState>
            ) : (
              <FormCard onSubmit={handleInvitationSubmit(onInvitationSubmit)}>
                <FormRow>
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
                </FormRow>
                <FormRow>
                  <label>이메일</label>
                  <TextInput type="email" {...invitationRegister('email')} />
                  {invitationErrors.email && (
                    <ErrorText>{invitationErrors.email.message}</ErrorText>
                  )}
                </FormRow>
                <FormRow>
                  <label>권한</label>
                  <Select {...invitationRegister('role')}>
                    <option value="VIEWER">읽기 전용</option>
                    <option value="EDITOR">편집 가능</option>
                  </Select>
                  {invitationErrors.role && (
                    <ErrorText>{invitationErrors.role.message}</ErrorText>
                  )}
                </FormRow>
                <PrimaryButton type="submit" disabled={isInvitationSubmitting}>
                  {isInvitationSubmitting ? '초대 중...' : '초대 보내기'}
                </PrimaryButton>
              </FormCard>
            )}

            <Divider />

            <SectionHeader>
              <h2>받은 초대</h2>
              <span>{receivedInvitations.length}건</span>
            </SectionHeader>
            {receivedInvitations.length === 0 ? (
              <EmptyState>받은 초대가 없습니다.</EmptyState>
            ) : (
              <InvitationList>
                {receivedInvitations.map((invitation) => (
                  <InvitationItem key={invitation.id}>
                    <div>
                      <InvitationTitle>{invitation.ledger.name}</InvitationTitle>
                      <InvitationMeta>
                        {invitation.invitedBy.nickname ??
                          invitation.invitedBy.email}{' '}
                        님이{' '}
                        {invitation.role === LedgerMemberRole.VIEWER
                          ? '읽기 전용'
                          : invitation.role === LedgerMemberRole.EDITOR
                          ? '편집 권한'
                          : '소유자 권한'}{' '}
                        으로 초대했습니다.
                      </InvitationMeta>
                    </div>
                    <InvitationActions>
                      <MiniButton
                        type="button"
                        onClick={() => handleRespondInvitation(invitation.token, true)}
                      >
                        수락
                      </MiniButton>
                      <DangerMiniButton
                        type="button"
                        onClick={() => handleRespondInvitation(invitation.token, false)}
                      >
                        거절
                      </DangerMiniButton>
                    </InvitationActions>
                  </InvitationItem>
                ))}
              </InvitationList>
            )}
          </InvitationSection>
        )}
      </ContentArea>

      {ledgerToDelete && (
        <DialogOverlay>
          <DialogCard>
            <h3>가계부 삭제</h3>
            <p>
              가계부 <strong>{ledgerToDelete.name}</strong> 을(를) 삭제하려면
              아래 입력란에 동일한 이름을 입력해주세요. 삭제된 가계부는
              되돌릴 수 없습니다.
            </p>
            <FormRow>
              <label>가계부 이름 확인</label>
              <TextInput
                type="text"
                value={deleteConfirmName}
                onChange={(event) => {
                  setDeleteConfirmName(event.target.value);
                  setDeleteError('');
                }}
                placeholder={ledgerToDelete.name}
              />
              {deleteError && <ErrorText>{deleteError}</ErrorText>}
            </FormRow>
            <DialogActions>
              <MiniButton type="button" onClick={closeDeleteLedgerDialog}>
                취소
              </MiniButton>
              <DangerMiniButton
                type="button"
                onClick={confirmDeleteLedger}
                disabled={isDeletingLedger}
              >
                {isDeletingLedger ? '삭제 중...' : '삭제'}
              </DangerMiniButton>
            </DialogActions>
          </DialogCard>
        </DialogOverlay>
      )}
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const PageHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  h1 {
    margin: 0;
    font-size: 2rem;
    color: #1f2937;
  }

  p {
    margin: 0;
    color: #6b7280;
  }
`;

const TabList = styled.div`
  display: inline-flex;
  background: #e7f1ff;
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
  align-self: flex-start;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 20px;
  border-radius: 999px;
  border: none;
  background: ${({ $active }) => ($active ? '#0d6efd' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#0d6efd')};
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${({ $active }) =>
      $active ? '#0b5ed7' : 'rgba(13, 110, 253, 0.15)'};
  }
`;

const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
`;

const InfoCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 1.3rem;
    color: #1f2937;
  }
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 12px;
    background: #f8fafc;
  }

  span {
    color: #6b7280;
    font-size: 0.95rem;
  }

  strong {
    color: #1f2937;
  }
`;

const FormCard = styled.form`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;

  label {
    font-weight: 600;
    color: #374151;
  }
`;

const TextInput = styled.input`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #0d6efd;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
    outline: none;
  }
`;

const Select = styled.select`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #0d6efd;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
    outline: none;
  }
`;

const ErrorText = styled.span`
  color: #c92a2a;
  font-size: 0.85rem;
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
`;

const PrimaryButton = styled.button`
  padding: 12px 18px;
  border-radius: 10px;
  border: none;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;

  &:hover {
    background: #0b5ed7;
  }

  &:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }
`;

const LedgerSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #4b5563;

  h2 {
    margin: 0;
    font-size: 1.4rem;
    color: #1f2937;
  }
`;

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const LedgerCard = styled.div<{ $isMain: boolean }>`
  position: relative;
  padding: 24px;
  border-radius: 18px;
  border: 1px solid ${({ $isMain }) => ($isMain ? '#0d6efd' : '#e5e7eb')};
  background: #ffffff;
  box-shadow: ${({ $isMain }) =>
    $isMain
      ? '0 16px 32px rgba(13, 110, 253, 0.2)'
      : '0 12px 24px rgba(15, 23, 42, 0.08)'};
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LedgerCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #111827;
  }
`;

const RoleBadge = styled.span`
  font-size: 0.85rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e7f1ff;
  color: #0d6efd;
  font-weight: 600;
`;

const LedgerCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  p {
    margin: 0;
    color: #4b5563;
  }
`;

const LedgerMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #6b7280;
`;

const LedgerActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MiniButton = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e2e8f0;
  }

  &:disabled {
    background: #e5e7eb;
    cursor: not-allowed;
  }
`;

const DangerMiniButton = styled(MiniButton)`
  background: #ffe3e3;
  color: #c92a2a;

  &:hover {
    background: #ffc9c9;
  }
`;

const MainBadge = styled.span`
  position: absolute;
  top: 16px;
  right: 16px;
  background: #0d6efd;
  color: #ffffff;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 600;
`;

const InvitationSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const InvitationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InvitationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
  gap: 16px;
`;

const InvitationTitle = styled.h3`
  margin: 0;
  font-size: 1.05rem;
  color: #1f2937;
`;

const InvitationMeta = styled.p`
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 0.9rem;
`;

const InvitationActions = styled.div`
  display: flex;
  gap: 8px;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px dashed #e5e7eb;
  margin: 8px 0;
`;

const EmptyState = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: #ffffff;
  color: #6b7280;
  text-align: center;
`;

const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  z-index: 200;
`;

const DialogCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);

  h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #1f2937;
  }

  p {
    margin: 0;
    color: #4b5563;
    line-height: 1.5;
  }
`;

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;
