import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  LedgerInvitationSummary,
  LedgerSummary,
  LedgerMemberRole,
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

    load();
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
      <PageContainer>
        <LoadingCard>대시보드 정보를 불러오는 중...</LoadingCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <HeaderRow>
        <div>
          <Title>가계부 대시보드</Title>
          <Subtitle>주요 가계부 현황과 받은 초대를 한눈에 확인하세요.</Subtitle>
        </div>
        <PrimaryButton type="button" onClick={() => navigate('/mypage')}>
          가계부 관리로 이동
        </PrimaryButton>
      </HeaderRow>

      {mainLedger ? (
        <MainLedgerCard>
          <CardHeader>
            <CardTitle>메인 가계부</CardTitle>
            <MainBadge>MAIN</MainBadge>
          </CardHeader>
          <LedgerName>{mainLedger.name}</LedgerName>
          <LedgerDescription>
            {mainLedger.description || '설명 정보가 없습니다.'}
          </LedgerDescription>
          <LedgerMeta>
            <span>통화: {mainLedger.currency}</span>
            <span>정산 기준일: 매월 {mainLedger.monthStartDay}일</span>
            <span>멤버: {mainLedger.memberCount}명</span>
          </LedgerMeta>
        </MainLedgerCard>
      ) : (
        <EmptyCard>
          <CardTitle>메인 가계부가 없습니다.</CardTitle>
          <p>새로운 가계부를 생성하고 메인으로 설정해보세요.</p>
          <PrimaryButton type="button" onClick={() => navigate('/mypage')}>
            가계부 만들기
          </PrimaryButton>
        </EmptyCard>
      )}

      <Section>
        <SectionHeader>
          <SectionTitle>다른 가계부</SectionTitle>
          <span>{otherLedgers.length}개</span>
        </SectionHeader>
        {otherLedgers.length === 0 ? (
          <EmptyState>다른 가계부가 없습니다.</EmptyState>
        ) : (
          <LedgerGrid>
            {otherLedgers.map((ledger) => (
              <LedgerCard key={ledger.id}>
                <CardHeader>
                  <LedgerName>{ledger.name}</LedgerName>
                  <RoleBadge>
                    {ledger.role === LedgerMemberRole.OWNER
                      ? '소유자'
                      : ledger.role === LedgerMemberRole.EDITOR
                      ? '편집'
                      : '읽기'}
                  </RoleBadge>
                </CardHeader>
                <LedgerDescription>
                  {ledger.description || '설명 없음'}
                </LedgerDescription>
                <LedgerMeta>
                  <span>통화: {ledger.currency}</span>
                  <span>정산 기준일: 매월 {ledger.monthStartDay}일</span>
                  <span>멤버: {ledger.memberCount}명</span>
                </LedgerMeta>
                {ledger.role !== LedgerMemberRole.VIEWER && (
                  <MiniButton type="button" onClick={() => handleSetMain(ledger.id)}>
                    메인으로 설정
                  </MiniButton>
                )}
              </LedgerCard>
            ))}
          </LedgerGrid>
        )}
      </Section>

      <Section>
        <SectionHeader>
          <SectionTitle>받은 초대</SectionTitle>
          <span>{invitations.length}건</span>
        </SectionHeader>
        {invitations.length === 0 ? (
          <EmptyState>받은 초대가 없습니다.</EmptyState>
        ) : (
          <InvitationList>
            {invitations.map((invitation) => (
              <InvitationItem key={invitation.id}>
                <div>
                  <InvitationTitle>{invitation.ledger.name}</InvitationTitle>
                  <InvitationMeta>
                    {invitation.invitedBy.nickname ?? invitation.invitedBy.email} 님이{' '}
                    {invitation.role === LedgerMemberRole.VIEWER
                      ? '읽기 전용'
                      : invitation.role === LedgerMemberRole.EDITOR
                      ? '편집 권한'
                      : '소유자 권한'}{' '}
                    으로 초대했습니다.
                  </InvitationMeta>
                </div>
                <SecondaryButton
                  type="button"
                  onClick={() => navigate(`/invitations/accept?token=${invitation.token}`)}
                >
                  응답하기
                </SecondaryButton>
              </InvitationItem>
            ))}
          </InvitationList>
        )}
      </Section>
    </PageContainer>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: 2rem;
  color: #1f2937;
`;

const Subtitle = styled.p`
  margin: 0;
  color: #6b7280;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
`;

const MainLedgerCard = styled.div`
  background: linear-gradient(135deg, #0d6efd, #66a6ff);
  color: #ffffff;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 18px 36px rgba(13, 110, 253, 0.25);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LoadingCard = styled.div`
  padding: 48px;
  text-align: center;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.1);
  color: #4b5563;
`;

const EmptyCard = styled.div`
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.1);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: inherit;
`;

const MainBadge = styled.span`
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const LedgerName = styled.h2`
  margin: 0;
  font-size: 1.5rem;
`;

const LedgerDescription = styled.p`
  margin: 0;
  color: inherit;
  opacity: 0.85;
  line-height: 1.5;
`;

const LedgerMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  font-size: 0.95rem;
  color: inherit;
`;

const LedgerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
`;

const LedgerCard = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const RoleBadge = styled.span`
  font-size: 0.8rem;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
  font-weight: 600;
`;

const InvitationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InvitationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  gap: 16px;
`;

const InvitationTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: #1f2937;
`;

const InvitationMeta = styled.p`
  margin: 4px 0 0;
  color: #4b5563;
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: #ffffff;
  color: #6b7280;
  text-align: center;
`;

const PrimaryButton = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #0b5ed7;
  }
`;

const SecondaryButton = styled.button`
  padding: 10px 16px;
  border: 1px solid #0d6efd;
  border-radius: 10px;
  background: rgba(13, 110, 253, 0.05);
  color: #0d6efd;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(13, 110, 253, 0.12);
  }
`;

const MiniButton = styled.button`
  align-self: flex-start;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #f1f3f5;
  color: #343a40;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e9ecef;
  }
`;
