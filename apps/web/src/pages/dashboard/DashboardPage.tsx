import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LedgerInvitationSummary,
  LedgerMemberRole,
  LedgerSummary,
} from '@garangbi/types';
import { ledgerService, notificationService } from '@services/index';

export function DashboardPage() {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [invitations, setInvitations] = useState<LedgerInvitationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mainLedger = useMemo(
    () => ledgers.find((ledger) => ledger.isMain) ?? ledgers[0] ?? null,
    [ledgers],
  );

  const otherLedgers = useMemo(
    () => ledgers.filter((ledger) => !ledger.isMain),
    [ledgers],
  );

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
        notificationService.error('대시보드 정보를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const handleSetMain = async (ledgerId: string) => {
    try {
      await ledgerService.setMainLedger(ledgerId);
      notificationService.success('메인 가계부를 변경했습니다.');
      const ledgerList = await ledgerService.listLedgers();
      setLedgers(ledgerList);
    } catch {
      notificationService.error('메인 가계부 변경에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="pixel-box text-center">
          대시보드 정보를 불러오는 중...
        </div>
      </div>
    );
  }

  const mockCategories = ['주거', '식비', '교통', '문화', '저축'];

  return (
    <div className="flex flex-col gap-6">
      <div className="pixel-box">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="pixel-heading">Garanbi Neo Budget</h1>
            <p className="pixel-text">선 굵은 재무 인사이트로, 오늘의 결정을 더 과감하게.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="pixel-button bg-pixel-blue text-white hover:text-white"
          >
            마이페이지로 이동
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="pixel-box">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="pixel-heading">Cash Vault</h2>
            <span className="rounded-[18px] border-4 border-black bg-pixel-yellow px-4 py-1 text-xs font-extrabold uppercase text-pixel-ink shadow-pixel-sm">
              MAIN
            </span>
          </header>
          {mainLedger ? (
            <div className="space-y-3">
              <p className="pixel-text text-pixel-ink">
                {mainLedger.description || '설명 정보가 없습니다.'}
              </p>
              <ul className="space-y-2 text-sm text-pixel-ink/75">
                <li>• 통화: {mainLedger.currency}</li>
                <li>• 정산 기준일: 매월 {mainLedger.monthStartDay}일</li>
                <li>• 파티 멤버: {mainLedger.memberCount}명</li>
              </ul>
            </div>
          ) : (
            <p className="pixel-text">메인 가계부가 없습니다. 새로운 금고를 지정해보세요!</p>
          )}
        </section>

        <section className="pixel-box">
          <header className="mb-4">
            <h2 className="pixel-heading">Shared Ledgers</h2>
            <p className="pixel-text">함께 쓰는 가계부를 정리하고 메인 보드를 선택하세요.</p>
          </header>
          {otherLedgers.length === 0 ? (
            <p className="pixel-text">추가 계정이 없습니다. 새로운 모험을 시작해보세요!</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {otherLedgers.map((ledger) => (
                <li
                  key={ledger.id}
                  className="rounded-[24px] border-4 border-black bg-white px-4 py-4 text-pixel-ink shadow-pixel-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-extrabold uppercase">{ledger.name}</span>
                    <span className="rounded-[14px] border-2 border-black bg-pixel-blue px-3 py-1 text-xs font-bold uppercase text-white shadow-pixel-sm">
                      {ledger.role === LedgerMemberRole.OWNER
                        ? '소유자'
                        : ledger.role === LedgerMemberRole.EDITOR
                        ? '편집'
                        : '읽기'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-pixel-ink/70">
                    {ledger.description || '설명 없음'}
                  </p>
                  {ledger.role !== LedgerMemberRole.VIEWER && (
                    <button
                      type="button"
                      onClick={() => handleSetMain(ledger.id)}
                      className="mt-3 pixel-button"
                    >
                      메인으로 설정
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pixel-box">
          <header className="mb-4 flex items-center justify-between">
            <h2 className="pixel-heading">Invites</h2>
            <span className="text-xs font-semibold uppercase text-pixel-ink/60">
              최근 초대 {invitations.length}건
            </span>
          </header>
          {invitations.length === 0 ? (
            <p className="pixel-text">받은 초대가 없습니다. 오늘은 조용한 날이에요.</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="rounded-[24px] border-4 border-black bg-white px-4 py-4 text-pixel-ink shadow-pixel-sm"
                >
                  <p className="text-base font-extrabold uppercase">{invitation.ledger.name}</p>
                  <p className="mt-2 text-sm text-pixel-ink/70">
                    {invitation.invitedBy.nickname ?? invitation.invitedBy.email} 님이{' '}
                    {invitation.role === LedgerMemberRole.VIEWER
                      ? '읽기 전용'
                      : invitation.role === LedgerMemberRole.EDITOR
                      ? '편집 권한'
                      : '소유자 권한'}{' '}
                    으로 초대했습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/invitations/accept?token=${invitation.token}`)}
                    className="mt-3 pixel-button bg-pixel-blue text-white hover:text-white"
                  >
                    초대 응답하기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pixel-box">
          <header className="mb-4">
            <h2 className="pixel-heading">Category Highlights</h2>
            <p className="pixel-text">요즘 가장 많이 사용하는 카테고리를 빠르게 훑어보세요.</p>
          </header>
          <ul className="grid gap-3 text-sm md:grid-cols-2">
            {mockCategories.map((category) => (
              <li
                key={category}
                className="rounded-[18px] border-4 border-black bg-white px-4 py-3 text-center text-base font-semibold uppercase text-pixel-ink shadow-pixel-sm"
              >
                {category}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <button type="button" className="pixel-button w-full bg-pixel-green text-pixel-ink hover:text-pixel-ink">
          Add Income
        </button>
        <button type="button" className="pixel-button w-full bg-pixel-red text-white hover:text-white">
          Add Expense
        </button>
      </div>
    </div>
  );
}
