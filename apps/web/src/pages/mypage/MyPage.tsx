import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { cn } from '../../lib/cn';
import { useNavigate } from 'react-router-dom';

const currencyOptions = ['KRW', 'USD', 'JPY'];

const deleteReasonOptions = [
  { value: '', label: '선택하지 않음' },
  { value: 'not-useful', label: '필요한 기능이 부족해요' },
  { value: 'complex', label: '사용하기 어려워요' },
  { value: 'bugs', label: '버그나 오류가 많아요' },
  { value: 'other-service', label: '다른 서비스를 이용하고 있어요' },
  { value: 'etc', label: '기타' },
];

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
  const navigate = useNavigate();

  const [isReauthCompleted, setIsReauthCompleted] = useState(!requiresPassword);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [hasPromptedReauth, setHasPromptedReauth] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const openDeleteAccountDialog = () => {
    setShowDeleteAccountModal(true);
    setDeleteAccountPassword('');
    setDeleteAccountConfirm(false);
    setDeleteAccountReason('');
    setDeleteAccountError(null);
  };

  const closeDeleteAccountDialog = () => {
    setShowDeleteAccountModal(false);
    setDeleteAccountPassword('');
    setDeleteAccountConfirm(false);
    setDeleteAccountReason('');
    setDeleteAccountError(null);
    setIsDeletingAccount(false);
  };

  const handleDeleteAccount = async () => {
    if (requiresPassword && !deleteAccountPassword) {
      setDeleteAccountError('현재 비밀번호를 입력해주세요.');
      return;
    }

    if (!deleteAccountConfirm) {
      setDeleteAccountError('탈퇴 동의 체크박스를 선택해주세요.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      await usersService.deleteAccount({
        password: requiresPassword ? deleteAccountPassword : undefined,
        confirm: true,
        reason: deleteAccountReason || undefined,
      });
      notificationService.success('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
      logout();
      closeDeleteAccountDialog();
      navigate('/login', { replace: true });
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '회원 탈퇴 처리 중 오류가 발생했습니다.';
      setDeleteAccountError(message);
    } finally {
      setIsDeletingAccount(false);
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

  const tabButtonClass = (isActive: boolean) =>
    cn(
      'rounded-[18px] border-4 border-black px-5 py-3 text-sm font-semibold uppercase tracking-wider text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md focus:outline-none',
      isActive ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink/70',
    );

  const inputClass =
    'w-full rounded-[22px] border-4 border-black bg-white px-5 py-3 text-base font-semibold text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out placeholder:text-pixel-ink/35 focus:-translate-x-1 focus:-translate-y-1 focus:border-pixel-blue focus:shadow-pixel-md focus:outline-none';
  const primaryButtonClass =
    'pixel-button bg-pixel-blue text-white hover:text-white disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none';
  const subtleButtonClass =
    'pixel-button px-4 py-2 bg-white text-pixel-ink hover:text-pixel-ink shadow-pixel-sm disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none';
  const dangerButtonClass =
    'pixel-button px-4 py-2 bg-pixel-red text-white hover:text-white shadow-pixel-sm disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none';
  const sectionCardClass = 'pixel-box';
  const sectionTitleClass = 'pixel-heading text-pixel-ink';
  const labelClass = 'text-sm font-semibold uppercase text-pixel-ink';
  const errorTextClass = 'text-xs font-semibold uppercase text-pixel-red';
  const helperTextClass = 'text-xs text-pixel-ink/60';
  const emptyStateClass = 'pixel-box text-center text-sm text-pixel-ink';

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="pixel-box text-center text-sm text-pixel-ink">
          내 정보를 불러오는 중입니다...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ReauthModal
        open={requiresPassword && showReauthModal && !isReauthCompleted}
        isSubmitting={isVerifyingPassword}
        errorMessage={reauthError}
        onVerify={handleVerifyAccess}
        onLogout={handleForceLogout}
      />

      <div className="pixel-box">
        <h1 className="pixel-heading text-3xl">마이페이지</h1>
        <p className="mt-2 text-sm text-pixel-ink/75">
          프로필과 가계부, 초대를 관리할 수 있습니다.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 rounded-[24px] border-4 border-black bg-white p-1">
        <button
          type="button"
          className={tabButtonClass(activeTab === 'profile')}
          onClick={() => setActiveTab('profile')}
        >
          프로필 관리
        </button>
        <button
          type="button"
          className={tabButtonClass(activeTab === 'ledgers')}
          onClick={() => setActiveTab('ledgers')}
        >
          가계부 관리
        </button>
        <button
          type="button"
          className={tabButtonClass(activeTab === 'invitations')}
          onClick={() => setActiveTab('invitations')}
        >
          초대 현황
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={sectionCardClass}>
            <h2 className={sectionTitleClass}>내 정보</h2>
            <ul className="mt-4 flex flex-col gap-3">
              <li className="flex items-center justify-between border-4 border-black bg-white px-4 py-3 text-sm text-pixel-ink shadow-pixel-sm">
                <span>이메일</span>
                <strong className="text-pixel-ink">{user?.email}</strong>
              </li>
              <li className="flex items-center justify-between border-4 border-black bg-white px-4 py-3 text-sm text-pixel-ink shadow-pixel-sm">
                <span>닉네임</span>
                <strong className="text-pixel-ink">
                  {user?.nickname ?? '미설정'}
                </strong>
              </li>
            </ul>
          </div>

          <form
            className={cn(sectionCardClass, 'flex flex-col gap-4')}
            onSubmit={handleProfileSubmit(onProfileSubmit)}
          >
            <div className="flex items-center justify-between">
              <h2 className={sectionTitleClass}>닉네임 변경</h2>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>새 닉네임</label>
              <input className={inputClass} type="text" {...profileRegister('nickname')} />
              {profileErrors.nickname && (
                <p className={errorTextClass}>{profileErrors.nickname.message}</p>
              )}
            </div>
            {requiresPassword ? (
              <div className="flex flex-col gap-2">
                <label className={labelClass}>현재 비밀번호</label>
                <input
                  className={inputClass}
                  type="password"
                  {...profileRegister('currentPassword')}
                />
                {profileErrors.currentPassword && (
                  <p className={errorTextClass}>
                    {profileErrors.currentPassword.message}
                  </p>
                )}
              </div>
            ) : (
              <p className={helperTextClass}>
                소셜 로그인 계정은 비밀번호 입력 없이 닉네임을 변경할 수 있습니다.
              </p>
            )}
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isProfileSubmitting}
            >
              {isProfileSubmitting ? '변경 중...' : '닉네임 변경'}
            </button>
          </form>

          <form
            className={cn(sectionCardClass, 'flex flex-col gap-4 lg:col-span-2')}
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          >
            <div className="flex items-center justify-between">
              <h2 className={sectionTitleClass}>비밀번호 변경</h2>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>현재 비밀번호</label>
              <input
                className={inputClass}
                type="password"
                {...passwordRegister('currentPassword')}
              />
              {passwordErrors.currentPassword && (
                <p className={errorTextClass}>
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>새 비밀번호</label>
              <input
                className={inputClass}
                type="password"
                {...passwordRegister('newPassword')}
              />
              {passwordErrors.newPassword && (
                <p className={errorTextClass}>{passwordErrors.newPassword.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>새 비밀번호 확인</label>
              <input
                className={inputClass}
                type="password"
                {...passwordRegister('confirmPassword')}
              />
              {passwordErrors.confirmPassword && (
                <p className={errorTextClass}>
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isPasswordSubmitting}
            >
              {isPasswordSubmitting ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>

          <div className={cn(sectionCardClass, 'flex flex-col gap-4 lg:col-span-2 border-pixel-red/70')}>
            <div className="flex items-center justify-between">
              <h2 className={sectionTitleClass}>회원 탈퇴</h2>
              <span className="rounded-full bg-pixel-red px-3 py-1 text-xs font-semibold uppercase text-white">
                주의
              </span>
            </div>
            <p className="text-sm text-pixel-ink/75">
              탈퇴를 진행하면 모든 가계부와 거래 내역이 즉시 삭제되며 복구할 수 없습니다. 다시 가입하더라도 데이터는 복원되지 않습니다.
            </p>
            <button
              type="button"
              className={cn(dangerButtonClass, 'self-start px-5 py-2 text-sm')}
              onClick={openDeleteAccountDialog}
            >
              회원 탈퇴 진행하기
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ledgers' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-pixel-ink">
            <h2 className={sectionTitleClass}>보유 가계부</h2>
            <span className="text-sm font-bold uppercase">{ledgers.length}개</span>
          </div>
          {ledgers.length === 0 ? (
            <div className={emptyStateClass}>
              보유한 가계부가 없습니다. 새로운 가계부를 생성해보세요.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {ledgers.map((ledger) => (
                <div
                  key={ledger.id}
                  className={cn('pixel-box transition', {
                    'border-pixel-blue shadow-pixel-lg': ledger.isMain,
                    'border-pixel-purple hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-pixel-md':
                      !ledger.isMain,
                  })}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="pixel-heading text-xl">
                      {ledger.name}
                    </h3>
                    <span className="rounded-[14px] border-4 border-black bg-pixel-blue px-3 py-1 text-xs font-bold uppercase text-white shadow-pixel-sm">
                      {ledger.role === LedgerMemberRole.OWNER
                        ? '소유자'
                        : ledger.role === LedgerMemberRole.EDITOR
                        ? '편집'
                        : '읽기'}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-sm text-pixel-ink">
                    <p>{ledger.description || '설명 없음'}</p>
                    <div className="flex flex-wrap gap-3 text-xs font-bold uppercase text-pixel-ink/80">
                      <span>통화: {ledger.currency}</span>
                      <span>정산 기준일: 매월 {ledger.monthStartDay}일</span>
                      <span>멤버: {ledger.memberCount}명</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {ledger.role !== LedgerMemberRole.VIEWER && (
                      <button
                        type="button"
                        className={cn(subtleButtonClass, 'px-3 py-1.5 text-xs')}
                        onClick={() => handleSetMain(ledger.id)}
                      >
                        메인 설정
                      </button>
                    )}
                    {ledger.role !== LedgerMemberRole.VIEWER && (
                      <button
                        type="button"
                        className={cn(subtleButtonClass, 'px-3 py-1.5 text-xs')}
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
                          void handleUpdateLedger(ledger.id, { name: newName });
                        }}
                      >
                        이름 변경
                      </button>
                    )}
                    {ledger.role === LedgerMemberRole.OWNER && (
                      <button
                        type="button"
                        className={cn(dangerButtonClass, 'px-3 py-1.5 text-xs')}
                        onClick={() => openDeleteLedgerDialog(ledger)}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  {ledger.isMain && (
                    <span className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow">
                      메인 가계부
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <form
            className={cn(sectionCardClass, 'flex flex-col gap-4')}
            onSubmit={handleCreateLedgerSubmit(onCreateLedger)}
          >
            <h2 className={sectionTitleClass}>새 가계부 만들기</h2>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>가계부 이름</label>
              <input className={inputClass} type="text" {...createLedgerRegister('name')} />
              {createLedgerErrors.name && (
                <p className={errorTextClass}>{createLedgerErrors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>설명</label>
              <input className={inputClass} type="text" {...createLedgerRegister('description')} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>기본 화폐</label>
              <select className={inputClass} {...createLedgerRegister('currency')}>
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              {createLedgerErrors.currency && (
                <p className={errorTextClass}>{createLedgerErrors.currency.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>정산 기준일</label>
              <input
                className={inputClass}
                type="number"
                min={1}
                max={28}
                {...createLedgerRegister('monthStartDay', { valueAsNumber: true })}
              />
              {createLedgerErrors.monthStartDay && (
                <p className={errorTextClass}>
                  {createLedgerErrors.monthStartDay.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              className={primaryButtonClass}
              disabled={isCreatingLedger}
            >
              {isCreatingLedger ? '생성 중...' : '가계부 만들기'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-pixel-ink">
            <h2 className={sectionTitleClass}>보낸 초대</h2>
            <span className="text-sm font-bold uppercase">
              {selectedLedgerInvitations.length}건{' '}
              {selectedLedgerId
                ? `(${
                    editableLedgers.find((ledger) => ledger.id === selectedLedgerId)?.name ??
                    ''
                  })`
                : ''}
            </span>
          </div>

          {editableLedgers.length === 0 ? (
            <div className={emptyStateClass}>
              초대를 보낼 수 있는 가계부가 없습니다. 권한이 있는 가계부를 생성하거나 요청해주세요.
            </div>
          ) : (
            <>
              <div className={cn(sectionCardClass, 'flex flex-col gap-4')}>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>가계부 선택</label>
                  <select
                    className={inputClass}
                    value={selectedLedgerId}
                    onChange={(event) => setSelectedLedgerId(event.target.value)}
                  >
                    {editableLedgers.map((ledger) => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isSentInvitationLoading ? (
                  <div className={emptyStateClass}>보낸 초대를 불러오는 중입니다...</div>
                ) : selectedLedgerInvitations.length === 0 ? (
                  <div className={emptyStateClass}>
                    선택한 가계부에서 발송한 초대가 없습니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedLedgerInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex flex-col gap-3 border-4 border-black bg-white px-4 py-3 text-sm text-pixel-ink shadow-pixel-sm md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold uppercase text-pixel-ink">
                            {invitation.email}
                          </div>
                          <div className="mt-1 text-xs uppercase text-pixel-ink/80">
                            {invitation.role === LedgerMemberRole.EDITOR
                              ? '편집 권한'
                              : invitation.role === LedgerMemberRole.OWNER
                              ? '소유자 권한'
                              : '읽기 전용'}{' '}
                            초대 • 만료일{' '}
                            {new Date(invitation.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={cn(dangerButtonClass, 'px-3 py-1.5 text-xs')}
                          onClick={() => handleRevokeInvitation(invitation.id)}
                        >
                          초대 취소
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                className={cn(sectionCardClass, 'flex flex-col gap-4')}
                onSubmit={handleInvitationSubmit(onInvitationSubmit)}
              >
                <h2 className={sectionTitleClass}>새 초대 보내기</h2>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>가계부 선택</label>
                  <select className={inputClass} {...invitationRegister('ledgerId')}>
                    <option value="">가계부를 선택하세요</option>
                    {editableLedgers.map((ledger) => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name}
                      </option>
                    ))}
                  </select>
                  {invitationErrors.ledgerId && (
                    <p className={errorTextClass}>{invitationErrors.ledgerId.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>이메일</label>
                  <input className={inputClass} type="email" {...invitationRegister('email')} />
                  {invitationErrors.email && (
                    <p className={errorTextClass}>{invitationErrors.email.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>권한</label>
                  <select className={inputClass} {...invitationRegister('role')}>
                    <option value="VIEWER">읽기 전용</option>
                    <option value="EDITOR">편집 가능</option>
                  </select>
                  {invitationErrors.role && (
                    <p className={errorTextClass}>{invitationErrors.role.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={isInvitationSubmitting}
                >
                  {isInvitationSubmitting ? '초대 중...' : '초대 보내기'}
                </button>
              </form>
            </>
          )}

          <div className="border-t-4 border-dashed border-pixel-yellow/40" />

          <div className="flex flex-wrap items-center justify-between gap-3 text-pixel-ink">
            <h2 className={sectionTitleClass}>받은 초대</h2>
            <span className="text-sm font-bold uppercase">{receivedInvitations.length}건</span>
          </div>
          {receivedInvitations.length === 0 ? (
            <div className={emptyStateClass}>받은 초대가 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {receivedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="pixel-box flex flex-col gap-3 text-pixel-ink md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="pixel-heading text-xl">
                      {invitation.ledger.name}
                    </h3>
                    <p className="mt-1 text-sm text-pixel-ink">
                      {invitation.invitedBy.nickname ?? invitation.invitedBy.email} 님이{' '}
                      {invitation.role === LedgerMemberRole.VIEWER
                        ? '읽기 전용'
                        : invitation.role === LedgerMemberRole.EDITOR
                        ? '편집 권한'
                        : '소유자 권한'}{' '}
                      으로 초대했습니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => handleRespondInvitation(invitation.token, true)}
                    >
                      수락
                    </button>
                    <button
                      type="button"
                      className={dangerButtonClass}
                      onClick={() => handleRespondInvitation(invitation.token, false)}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDeleteAccountModal ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#05060c]/70 px-4 py-6">
          <div className="pixel-box w-full max-w-lg text-pixel-ink">
            <h3 className="pixel-heading text-2xl">회원 탈퇴</h3>
            <p className="mt-2 text-sm text-pixel-ink/75">
              탈퇴하면 모든 가계부와 거래 내역이 영구적으로 삭제되며 복구할 수 없습니다. 정말로 진행하시겠습니까?
            </p>
            {requiresPassword ? (
              <div className="mt-4 flex flex-col gap-2">
                <label className={labelClass}>현재 비밀번호</label>
                <input
                  className={inputClass}
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(event) => {
                    setDeleteAccountPassword(event.target.value);
                    setDeleteAccountError(null);
                  }}
                  placeholder="현재 비밀번호"
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-pixel-ink/60">
                소셜 로그인 계정은 비밀번호 입력 없이 탈퇴할 수 있습니다.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <label className={labelClass}>탈퇴 사유 (선택)</label>
              <select
                className={inputClass}
                value={deleteAccountReason}
                onChange={(event) => {
                  setDeleteAccountReason(event.target.value);
                  setDeleteAccountError(null);
                }}
              >
                {deleteReasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-pixel-ink">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded-[10px] border-[3px] border-black bg-white text-pixel-ink focus:outline-none focus:ring-0"
                checked={deleteAccountConfirm}
                onChange={(event) => {
                  setDeleteAccountConfirm(event.target.checked);
                  setDeleteAccountError(null);
                }}
              />
              <span>위 내용을 모두 확인했으며, 탈퇴에 동의합니다.</span>
            </label>
            {deleteAccountError ? (
              <p className={cn(errorTextClass, 'mt-3')}>{deleteAccountError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={subtleButtonClass} onClick={closeDeleteAccountDialog}>
                취소
              </button>
              <button
                type="button"
                className={dangerButtonClass}
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? '탈퇴 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ledgerToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05060c]/70 px-4">
          <div className="pixel-box w-full max-w-md text-pixel-ink">
            <h3 className="text-base font-bold uppercase tracking-widest text-pixel-ink">
              가계부 삭제
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-pixel-ink">
              가계부{' '}
              <strong className="font-bold text-pixel-ink">
                {ledgerToDelete.name}
              </strong>
              을(를) 삭제하려면 동일한 이름을 입력해주세요. 삭제된 가계부는 되돌릴 수 없습니다.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <label className={labelClass}>가계부 이름 확인</label>
              <input
                className={inputClass}
                type="text"
                value={deleteConfirmName}
                onChange={(event) => {
                  setDeleteConfirmName(event.target.value);
                  setDeleteError('');
                }}
                placeholder={ledgerToDelete.name}
              />
              {deleteError && <p className={errorTextClass}>{deleteError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={subtleButtonClass}
                onClick={closeDeleteLedgerDialog}
              >
                취소
              </button>
              <button
                type="button"
                className={dangerButtonClass}
                onClick={confirmDeleteLedger}
                disabled={isDeletingLedger}
              >
                {isDeletingLedger ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
