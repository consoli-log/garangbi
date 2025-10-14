import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Asset,
  AssetGroup,
  AssetGroupType,
  AssetType,
  CategoryNode,
  CategoryType,
  LedgerMemberRole,
  LedgerSummary,
  ReorderItemPayload,
} from '@garangbi/types';
import { ledgerService, notificationService } from '@services/index';

type TabKey = 'assets' | 'categories';

type AssetGroupFormValues = {
  name: string;
  type: AssetGroupType;
};

type AssetFormValues = {
  name: string;
  type: AssetType;
  groupId: string;
  initialAmount: number;
  includeInNetWorth: boolean;
  billingDay?: number | '';
  upcomingPaymentAmount?: number | '';
};

type AssetModalState =
  | { isOpen: false }
  | {
      isOpen: true;
      mode: 'create' | 'edit';
      ledgerId: string;
      groupId: string;
      asset?: Asset;
    };

type GroupModalState =
  | { isOpen: false }
  | {
      isOpen: true;
      mode: 'create' | 'edit';
      ledgerId: string;
      group?: AssetGroup;
    };

const assetGroupSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  type: z.nativeEnum(AssetGroupType),
});

const assetFormSchema = z
  .object({
    name: z.string().min(1, '이름을 입력해주세요.'),
    type: z.nativeEnum(AssetType),
    groupId: z.string().min(1, '그룹을 선택해주세요.'),
    initialAmount: z
      .number({
        required_error: '초기 금액을 입력해주세요.',
        invalid_type_error: '초기 금액을 숫자로 입력해주세요.',
      })
      .refine((value) => Number.isInteger(value), '초기 금액은 정수여야 합니다.'),
    includeInNetWorth: z.boolean(),
    billingDay: z
      .number()
      .int()
      .min(1)
      .max(31)
      .optional()
      .or(z.literal('')),
    upcomingPaymentAmount: z
      .number()
      .refine((value) => Number.isInteger(value), '결제 예정 금액은 정수여야 합니다.')
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.type === AssetType.CREDIT_CARD && !data.billingDay) {
      ctx.addIssue({
        path: ['billingDay'],
        code: z.ZodIssueCode.custom,
        message: '신용카드는 결제일을 입력해야 합니다.',
      });
    }
  });

const assetTypeLabel: Record<AssetType, string> = {
  [AssetType.CASH]: '현금',
  [AssetType.BANK]: '은행',
  [AssetType.CHECK_CARD]: '체크 카드',
  [AssetType.CREDIT_CARD]: '신용 카드',
  [AssetType.LOAN]: '대출',
  [AssetType.INVESTMENT]: '투자',
  [AssetType.OTHER]: '기타',
};

const assetGroupTypeLabel: Record<AssetGroupType, string> = {
  [AssetGroupType.ASSET]: '자산',
  [AssetGroupType.LIABILITY]: '부채',
};

export function LedgerManagementPage() {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const editableLedgers = useMemo(
    () => ledgers.filter((ledger) => ledger.role !== LedgerMemberRole.VIEWER),
    [ledgers],
  );
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [categories, setCategories] = useState<{
    income: CategoryNode[];
    expense: CategoryNode[];
  }>({ income: [], expense: [] });
  const [activeTab, setActiveTab] = useState<TabKey>('assets');
  const [isLedgerLoading, setIsLedgerLoading] = useState(true);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [assetModal, setAssetModal] = useState<AssetModalState>({ isOpen: false });
  const [groupModal, setGroupModal] = useState<GroupModalState>({ isOpen: false });

  useEffect(() => {
    const loadLedgers = async () => {
      try {
        setIsLedgerLoading(true);
        const ledgerList = await ledgerService.listLedgers();
        setLedgers(ledgerList);
        const editable = ledgerList.filter(
          (ledger) => ledger.role === LedgerMemberRole.OWNER || ledger.role === LedgerMemberRole.EDITOR,
        );
        if (editable.length > 0) {
          setSelectedLedgerId(editable[0].id);
        } else {
          setSelectedLedgerId('');
        }
      } catch (error) {
        notificationService.error('가계부 목록을 불러오지 못했습니다.');
      } finally {
        setIsLedgerLoading(false);
      }
    };

    loadLedgers();
  }, []);

  const loadAssetGroups = useCallback(
    async (ledgerId: string) => {
      try {
        setIsAssetsLoading(true);
        const groups = await ledgerService.getAssetGroups(ledgerId);
        setAssetGroups(groups);
      } catch (error) {
        notificationService.error('자산 정보를 불러오지 못했습니다.');
      } finally {
        setIsAssetsLoading(false);
      }
    },
    [],
  );

  const loadCategories = useCallback(
    async (ledgerId: string) => {
      try {
        setIsCategoriesLoading(true);
        const result = await ledgerService.getCategories(ledgerId);
        setCategories(result);
      } catch (error) {
        notificationService.error('카테고리 정보를 불러오지 못했습니다.');
      } finally {
        setIsCategoriesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedLedgerId) {
      setAssetGroups([]);
      setCategories({ income: [], expense: [] });
      return;
    }

    loadAssetGroups(selectedLedgerId);
    loadCategories(selectedLedgerId);
  }, [selectedLedgerId, loadAssetGroups, loadCategories]);

  const handleOpenGroupModal = (mode: 'create' | 'edit', group?: AssetGroup) => {
    if (!selectedLedgerId) {
      return;
    }
    setGroupModal({ isOpen: true, mode, ledgerId: selectedLedgerId, group });
  };

  const handleSubmitGroup = async (values: AssetGroupFormValues, mode: 'create' | 'edit', group?: AssetGroup) => {
    if (!selectedLedgerId) return;
    try {
      if (mode === 'create') {
        await ledgerService.createAssetGroup(selectedLedgerId, values);
        notificationService.success('자산 그룹이 추가되었습니다.');
      } else if (group) {
        await ledgerService.updateAssetGroup(group.id, {
          name: values.name,
          type: values.type,
        });
        notificationService.success('자산 그룹이 수정되었습니다.');
      }
      await loadAssetGroups(selectedLedgerId);
      setGroupModal({ isOpen: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '자산 그룹 작업에 실패했습니다. 입력 값을 확인해주세요.';
      notificationService.error(message);
    }
  };

  const handleDeleteGroup = async (group: AssetGroup) => {
    if (!window.confirm(`"${group.name}" 그룹을 삭제하시겠습니까? 자산이 있는 그룹은 삭제할 수 없습니다.`)) {
      return;
    }

    try {
      await ledgerService.deleteAssetGroup(group.id);
      notificationService.success('자산 그룹을 삭제했습니다.');
      await loadAssetGroups(group.ledgerId);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '자산 그룹 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const handleReorderGroups = async (groupId: string, direction: 'up' | 'down') => {
    if (!selectedLedgerId) return;
    const index = assetGroups.findIndex((group) => group.id === groupId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= assetGroups.length) return;

    const reordered = [...assetGroups];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setAssetGroups(reordered);

    const payload: ReorderItemPayload[] = reordered.map((group, idx) => ({
      id: group.id,
      sortOrder: idx,
    }));

    try {
      await ledgerService.reorderAssetGroups(selectedLedgerId, payload);
      await loadAssetGroups(selectedLedgerId);
    } catch (error) {
      notificationService.error('정렬에 실패했습니다. 다시 시도해주세요.');
      await loadAssetGroups(selectedLedgerId);
    }
  };

  const handleOpenAssetModal = (mode: 'create' | 'edit', group: AssetGroup, asset?: Asset) => {
    if (!selectedLedgerId) {
      return;
    }
    setAssetModal({
      isOpen: true,
      mode,
      ledgerId: selectedLedgerId,
      groupId: asset?.groupId ?? group.id,
      asset,
    });
  };

  const handleSubmitAsset = async (values: AssetFormValues, mode: 'create' | 'edit', asset?: Asset) => {
    if (!selectedLedgerId) return;

    const payload = {
      name: values.name,
      type: values.type,
      groupId: values.groupId,
      initialAmount: values.initialAmount,
      includeInNetWorth: values.includeInNetWorth,
      billingDay: values.billingDay === '' ? undefined : values.billingDay,
      upcomingPaymentAmount:
        values.upcomingPaymentAmount === '' ? undefined : values.upcomingPaymentAmount,
    };

    try {
      if (mode === 'create') {
        await ledgerService.createAsset(selectedLedgerId, payload);
        notificationService.success('자산이 추가되었습니다.');
      } else if (asset) {
        await ledgerService.updateAsset(asset.id, payload);
        notificationService.success('자산이 수정되었습니다.');
      }
      await loadAssetGroups(selectedLedgerId);
      setAssetModal({ isOpen: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '자산 작업에 실패했습니다. 입력 값을 확인해주세요.';
      notificationService.error(message);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm(`"${asset.name}" 자산을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await ledgerService.deleteAsset(asset.id);
      notificationService.success('자산을 삭제했습니다.');
      await loadAssetGroups(asset.ledgerId);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '자산 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.';
      notificationService.error(message);
    }
  };

  const handleReorderAssets = async (group: AssetGroup, assetId: string, direction: 'up' | 'down') => {
    if (!selectedLedgerId) return;

    const index = group.assets.findIndex((asset) => asset.id === assetId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= group.assets.length) return;

    const reordered = [...group.assets];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    const payload: ReorderItemPayload[] = reordered.map((asset, idx) => ({
      id: asset.id,
      sortOrder: idx,
    }));

    try {
      await ledgerService.reorderAssets(selectedLedgerId, payload);
      await loadAssetGroups(selectedLedgerId);
    } catch (error) {
      notificationService.error('자산 순서 변경에 실패했습니다.');
      await loadAssetGroups(selectedLedgerId);
    }
  };

  const handleAddCategory = async (type: CategoryType, parentId?: string | null) => {
    if (!selectedLedgerId) return;
    const name = window.prompt('카테고리 이름을 입력해주세요.');
    if (!name) return;

    try {
      await ledgerService.createCategory(selectedLedgerId, {
        name,
        type,
        parentId: parentId ?? undefined,
      });
      notificationService.success('카테고리가 추가되었습니다.');
      await loadCategories(selectedLedgerId);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '카테고리 추가에 실패했습니다. 입력 값을 확인해주세요.';
      notificationService.error(message);
    }
  };

  const handleRenameCategory = async (category: CategoryNode) => {
    const name = window.prompt('새 카테고리 이름을 입력해주세요.', category.name);
    if (!name || name.trim() === '' || name === category.name) {
      return;
    }

    try {
      await ledgerService.updateCategory(category.id, { name: name.trim() });
      notificationService.success('카테고리 이름을 변경했습니다.');
      if (selectedLedgerId) {
        await loadCategories(selectedLedgerId);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '카테고리 이름 변경에 실패했습니다.';
      notificationService.error(message);
    }
  };

  const handleDeleteCategory = async (category: CategoryNode) => {
    if (
      !window.confirm(
        `"${category.name}" 카테고리를 삭제하시겠습니까? 하위 카테고리가 있다면 먼저 삭제해야 합니다.`,
      )
    ) {
      return;
    }

    try {
      await ledgerService.deleteCategory(category.id);
      notificationService.success('카테고리를 삭제했습니다.');
      if (selectedLedgerId) {
        await loadCategories(selectedLedgerId);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? '카테고리 삭제에 실패했습니다.';
      notificationService.error(message);
    }
  };

  const findCategorySiblings = (
    type: CategoryType,
    parentId: string | null | undefined,
  ): CategoryNode[] => {
    const root = type === CategoryType.INCOME ? categories.income : categories.expense;
    if (!parentId) {
      return root;
    }

    const stack = [...root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      if (node.id === parentId) {
        return node.children;
      }
      stack.push(...node.children);
    }
    return [];
  };

  const handleReorderCategory = async (category: CategoryNode, direction: 'up' | 'down') => {
    if (!selectedLedgerId) return;

    const parentId = category.parentId ?? null;
    const siblings = [...findCategorySiblings(category.type, parentId)];
    const index = siblings.findIndex((node) => node.id === category.id);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    [siblings[index], siblings[targetIndex]] = [siblings[targetIndex], siblings[index]];

    const payload: ReorderItemPayload[] = siblings.map((node, idx) => ({
      id: node.id,
      sortOrder: idx,
    }));

    try {
      await ledgerService.reorderCategories(selectedLedgerId, payload);
      await loadCategories(selectedLedgerId);
    } catch (error) {
      notificationService.error('카테고리 순서 변경에 실패했습니다.');
      await loadCategories(selectedLedgerId);
    }
  };

  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    const siblingList = findCategorySiblings(node.type, node.parentId ?? null);
    const siblingIndex = siblingList.findIndex((item) => item.id === node.id);
    const isFirst = siblingIndex <= 0;
    const isLast = siblingIndex === siblingList.length - 1;

    return (
      <CategoryNodeItem key={node.id}>
        <CategoryNodeHeader $depth={depth}>
          <span>{node.name}</span>
          <CategoryActions>
            <MiniButton type="button" onClick={() => handleAddCategory(node.type, node.id)}>
              하위 추가
            </MiniButton>
            <MiniButton type="button" onClick={() => handleRenameCategory(node)}>
              이름 변경
            </MiniButton>
            <MiniButton
              type="button"
              onClick={() => handleReorderCategory(node, 'up')}
              disabled={isFirst}
            >
              ▲
            </MiniButton>
            <MiniButton
              type="button"
              onClick={() => handleReorderCategory(node, 'down')}
              disabled={isLast}
            >
              ▼
            </MiniButton>
            <DangerMiniButton type="button" onClick={() => handleDeleteCategory(node)}>
              삭제
            </DangerMiniButton>
          </CategoryActions>
        </CategoryNodeHeader>
        {node.children.length > 0 ? (
          <CategoryChildren>{node.children.map((child) => renderCategoryNode(child, depth + 1))}</CategoryChildren>
        ) : null}
      </CategoryNodeItem>
    );
  };

  const selectedLedger = ledgers.find((ledger) => ledger.id === selectedLedgerId) ?? null;

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <Title>가계부 상세 관리</Title>
          <Subtitle>자산과 카테고리를 구성해 가계부 구조를 정리하세요.</Subtitle>
        </div>
      </PageHeader>

      {isLedgerLoading ? (
        <EmptyState>가계부 정보를 불러오는 중입니다...</EmptyState>
      ) : editableLedgers.length === 0 ? (
        <EmptyState>편집 가능한 가계부가 없습니다. 소유자에게 권한을 요청하거나 새로운 가계부를 생성하세요.</EmptyState>
      ) : (
        <>
          <Toolbar>
            <div>
              <label htmlFor="ledger-select">가계부 선택</label>
              <LedgerSelect
                id="ledger-select"
                value={selectedLedgerId}
                onChange={(event) => setSelectedLedgerId(event.target.value)}
              >
                {editableLedgers.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledger.name} ({ledger.role === LedgerMemberRole.OWNER ? '소유자' : '편집 권한'})
                  </option>
                ))}
              </LedgerSelect>
            </div>
            <TabSwitcher>
              <TabButton type="button" $active={activeTab === 'assets'} onClick={() => setActiveTab('assets')}>
                자산 관리
              </TabButton>
              <TabButton type="button" $active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
                카테고리 관리
              </TabButton>
            </TabSwitcher>
          </Toolbar>

          {activeTab === 'assets' ? (
            <AssetSection>
              <SectionHeaderRow>
                <h2>자산 그룹 및 자산</h2>
                <PrimaryButton type="button" onClick={() => handleOpenGroupModal('create')}>
                  새 자산 그룹 추가
                </PrimaryButton>
              </SectionHeaderRow>
              {isAssetsLoading ? (
                <EmptyState>자산 정보를 불러오는 중입니다...</EmptyState>
              ) : assetGroups.length === 0 ? (
                <EmptyState>
                  아직 자산 그룹이 없습니다. “새 자산 그룹 추가” 버튼으로 첫 번째 그룹을 만들어보세요.
                </EmptyState>
              ) : (
                <GroupGrid>
                  {assetGroups.map((group, index) => (
                    <GroupCard key={group.id}>
                      <GroupHeader>
                        <GroupTitle>
                          <span>{group.name}</span>
                          <small>{assetGroupTypeLabel[group.type]}</small>
                        </GroupTitle>
                        <GroupActions>
                          <MiniButton type="button" onClick={() => handleOpenGroupModal('edit', group)}>
                            수정
                          </MiniButton>
                          <MiniButton type="button" onClick={() => handleReorderGroups(group.id, 'up')} disabled={index === 0}>
                            ▲
                          </MiniButton>
                          <MiniButton
                            type="button"
                            onClick={() => handleReorderGroups(group.id, 'down')}
                            disabled={index === assetGroups.length - 1}
                          >
                            ▼
                          </MiniButton>
                          <DangerMiniButton type="button" onClick={() => handleDeleteGroup(group)}>
                            삭제
                          </DangerMiniButton>
                        </GroupActions>
                      </GroupHeader>

                      <AssetList>
                        {group.assets.length === 0 ? (
                          <AssetEmptyState>이 그룹에는 아직 자산이 없습니다.</AssetEmptyState>
                        ) : (
                          group.assets
                            .slice()
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((asset, assetIndex) => (
                              <AssetItem key={asset.id}>
                                <AssetInfo>
                                  <AssetName>
                                    {asset.name}{' '}
                                    <span>
                                      ({assetTypeLabel[asset.type]} · 초기 금액 {asset.initialAmount.toLocaleString()}원)
                                    </span>
                                  </AssetName>
                                  <AssetMeta>
                                    <span>{asset.includeInNetWorth ? '순자산 포함' : '순자산 제외'}</span>
                                    {asset.billingDay ? <span>결제일 {asset.billingDay}일</span> : null}
                                    {asset.upcomingPaymentAmount
                                      ? (
                                          <span>
                                            결제 예정 {asset.upcomingPaymentAmount.toLocaleString()}원
                                          </span>
                                        )
                                      : null}
                                  </AssetMeta>
                                </AssetInfo>
                                <AssetActions>
                                  <MiniButton type="button" onClick={() => handleOpenAssetModal('edit', group, asset)}>
                                    수정
                                  </MiniButton>
                                  <MiniButton
                                    type="button"
                                    onClick={() => handleReorderAssets(group, asset.id, 'up')}
                                    disabled={assetIndex === 0}
                                  >
                                    ▲
                                  </MiniButton>
                                  <MiniButton
                                    type="button"
                                    onClick={() => handleReorderAssets(group, asset.id, 'down')}
                                    disabled={assetIndex === group.assets.length - 1}
                                  >
                                    ▼
                                  </MiniButton>
                                  <DangerMiniButton type="button" onClick={() => handleDeleteAsset(asset)}>
                                    삭제
                                  </DangerMiniButton>
                                </AssetActions>
                              </AssetItem>
                            ))
                        )}
                      </AssetList>

                      <PrimaryButton type="button" onClick={() => handleOpenAssetModal('create', group)}>
                        자산 추가
                      </PrimaryButton>
                    </GroupCard>
                  ))}
                </GroupGrid>
              )}
            </AssetSection>
          ) : (
            <CategorySection>
              <SectionHeaderRow>
                <h2>카테고리 구조</h2>
                {selectedLedger ? (
                  <span>
                    {selectedLedger.currency} · 정산 기준일 매월 {selectedLedger.monthStartDay}일 · 참여 {selectedLedger.memberCount}명
                  </span>
                ) : null}
              </SectionHeaderRow>
              <CategoryColumns>
                <CategoryColumn>
                  <CategoryColumnHeader>
                    <h3>수입 카테고리</h3>
                    <PrimaryButton type="button" onClick={() => handleAddCategory(CategoryType.INCOME)}>
                      새 수입 카테고리
                    </PrimaryButton>
                  </CategoryColumnHeader>
                  {isCategoriesLoading ? (
                    <EmptyState>카테고리를 불러오는 중입니다...</EmptyState>
                  ) : categories.income.length === 0 ? (
                    <EmptyState>수입 카테고리가 없습니다. 첫 번째 항목을 추가해보세요.</EmptyState>
                  ) : (
                    <CategoryTree>{categories.income.map((node) => renderCategoryNode(node))}</CategoryTree>
                  )}
                </CategoryColumn>
                <CategoryColumn>
                  <CategoryColumnHeader>
                    <h3>지출 카테고리</h3>
                    <PrimaryButton type="button" onClick={() => handleAddCategory(CategoryType.EXPENSE)}>
                      새 지출 카테고리
                    </PrimaryButton>
                  </CategoryColumnHeader>
                  {isCategoriesLoading ? (
                    <EmptyState>카테고리를 불러오는 중입니다...</EmptyState>
                  ) : categories.expense.length === 0 ? (
                    <EmptyState>지출 카테고리가 없습니다. 첫 번째 항목을 추가해보세요.</EmptyState>
                  ) : (
                    <CategoryTree>{categories.expense.map((node) => renderCategoryNode(node))}</CategoryTree>
                  )}
                </CategoryColumn>
              </CategoryColumns>
            </CategorySection>
          )}
        </>
      )}

      {groupModal.isOpen ? (
        <AssetGroupModal
          mode={groupModal.mode}
          group={groupModal.group}
          onClose={() => setGroupModal({ isOpen: false })}
          onSubmit={(values) => handleSubmitGroup(values, groupModal.mode, groupModal.group)}
        />
      ) : null}

      {assetModal.isOpen ? (
        <AssetModal
          mode={assetModal.mode}
          asset={assetModal.asset}
          selectedGroupId={assetModal.groupId}
          groups={assetGroups}
          onClose={() => setAssetModal({ isOpen: false })}
          onSubmit={(values) => handleSubmitAsset(values, assetModal.mode, assetModal.asset)}
        />
      ) : null}
    </PageContainer>
  );
}

type AssetGroupModalProps = {
  mode: 'create' | 'edit';
  group?: AssetGroup;
  onClose: () => void;
  onSubmit: (values: AssetGroupFormValues) => Promise<void>;
};

function AssetGroupModal({ mode, group, onClose, onSubmit }: AssetGroupModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssetGroupFormValues>({
    resolver: zodResolver(assetGroupSchema),
    defaultValues: {
      name: group?.name ?? '',
      type: group?.type ?? AssetGroupType.ASSET,
    },
  });

  const submitHandler = async (values: AssetGroupFormValues) => {
    await onSubmit(values);
  };

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalHeader>
          <h3>{mode === 'create' ? '새 자산 그룹' : '자산 그룹 수정'}</h3>
        </ModalHeader>
        <ModalBody as="form" onSubmit={handleSubmit(submitHandler)}>
          <ModalFormRow>
            <label>이름</label>
            <TextInput type="text" {...register('name')} />
            {errors.name ? <ErrorText>{errors.name.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>유형</label>
            <Select {...register('type')}>
              {Object.values(AssetGroupType).map((type) => (
                <option key={type} value={type}>
                  {assetGroupTypeLabel[type]}
                </option>
              ))}
            </Select>
            {errors.type ? <ErrorText>{errors.type.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalActions>
            <MiniButton type="button" onClick={onClose}>
              취소
            </MiniButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </PrimaryButton>
          </ModalActions>
        </ModalBody>
      </ModalCard>
    </ModalOverlay>
  );
}

type AssetModalProps = {
  mode: 'create' | 'edit';
  asset?: Asset;
  selectedGroupId: string;
  groups: AssetGroup[];
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<void>;
};

function AssetModal({ mode, asset, selectedGroupId, groups, onClose, onSubmit }: AssetModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: asset?.name ?? '',
      type: asset?.type ?? AssetType.CASH,
      groupId: asset?.groupId ?? selectedGroupId,
      initialAmount: asset?.initialAmount ?? 0,
      includeInNetWorth: asset?.includeInNetWorth ?? true,
      billingDay: asset?.billingDay ?? '',
      upcomingPaymentAmount: asset?.upcomingPaymentAmount ?? '',
    },
  });

  const selectedType = watch('type');

  const submitHandler = async (values: AssetFormValues) => {
    await onSubmit(values);
  };

  return (
    <ModalOverlay>
      <ModalCard>
        <ModalHeader>
          <h3>{mode === 'create' ? '새 자산 추가' : '자산 수정'}</h3>
        </ModalHeader>
        <ModalBody as="form" onSubmit={handleSubmit(submitHandler)}>
          <ModalFormRow>
            <label>이름</label>
            <TextInput type="text" {...register('name')} />
            {errors.name ? <ErrorText>{errors.name.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>그룹</label>
            <Select {...register('groupId')}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
            {errors.groupId ? <ErrorText>{errors.groupId.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>유형</label>
            <Select {...register('type')}>
              {Object.values(AssetType).map((type) => (
                <option key={type} value={type}>
                  {assetTypeLabel[type]}
                </option>
              ))}
            </Select>
            {errors.type ? <ErrorText>{errors.type.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>초기 금액</label>
            <TextInput type="number" {...register('initialAmount', { valueAsNumber: true })} />
            {errors.initialAmount ? <ErrorText>{errors.initialAmount.message}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>
              <input type="checkbox" {...register('includeInNetWorth')} />
              순자산에 포함
            </label>
          </ModalFormRow>
          <ModalFormRow>
            <label>결제일 (신용카드)</label>
            <TextInput type="number" {...register('billingDay', { valueAsNumber: true })} disabled={selectedType !== AssetType.CREDIT_CARD} />
            {errors.billingDay ? <ErrorText>{errors.billingDay.message as string}</ErrorText> : null}
          </ModalFormRow>
          <ModalFormRow>
            <label>결제 예정 금액</label>
            <TextInput type="number" {...register('upcomingPaymentAmount', { valueAsNumber: true })} />
            {errors.upcomingPaymentAmount ? (
              <ErrorText>{errors.upcomingPaymentAmount.message as string}</ErrorText>
            ) : null}
          </ModalFormRow>

          <ModalActions>
            <MiniButton type="button" onClick={onClose}>
              취소
            </MiniButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </PrimaryButton>
          </ModalActions>
        </ModalBody>
      </ModalCard>
    </ModalOverlay>
  );
}

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    color: #4b5563;
    font-weight: 600;
  }
`;

const LedgerSelect = styled.select`
  min-width: 240px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 1rem;

  &:focus {
    border-color: #0d6efd;
    outline: none;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.12);
  }
`;

const TabSwitcher = styled.div`
  display: inline-flex;
  background: #e7f1ff;
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 18px;
  border-radius: 999px;
  border: none;
  background: ${({ $active }) => ($active ? '#0d6efd' : 'transparent')};
  color: ${({ $active }) => ($active ? '#ffffff' : '#0d6efd')};
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ $active }) =>
      $active ? '#0b5ed7' : 'rgba(13, 110, 253, 0.12)'};
  }
`;

const SectionHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }

  span {
    color: #6b7280;
  }
`;

const AssetSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GroupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

const GroupCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const GroupTitle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  span {
    font-size: 1.2rem;
    font-weight: 600;
    color: #111827;
  }
  small {
    color: #6b7280;
  }
`;

const GroupActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const AssetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AssetItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
`;

const AssetInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const AssetName = styled.span`
  font-weight: 600;
  color: #111827;

  span {
    font-weight: 400;
    color: #6b7280;
  }
`;

const AssetMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.9rem;
  color: #6b7280;
`;

const AssetActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const AssetEmptyState = styled.div`
  padding: 16px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  text-align: center;
`;

const CategorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const CategoryColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
`;

const CategoryColumn = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CategoryColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  h3 {
    margin: 0;
    color: #1f2937;
  }
`;

const CategoryTree = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CategoryNodeItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CategoryNodeHeader = styled.div<{ $depth: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: ${({ $depth }) => ($depth === 0 ? '#edf2ff' : '#f8fafc')};
  margin-left: ${({ $depth }) => $depth * 16}px;

  span {
    font-weight: 600;
    color: #1f2937;
  }
`;

const CategoryActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CategoryChildren = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const EmptyState = styled.div`
  padding: 24px;
  border-radius: 16px;
  background: #ffffff;
  text-align: center;
  color: #6b7280;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
`;

const PrimaryButton = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: #0d6efd;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #0b5ed7;
  }

  &:disabled {
    background: #93c5fd;
    cursor: not-allowed;
  }
`;

const MiniButton = styled.button`
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #e2e8f0;
  }

  &:disabled {
    background: #e9ecef;
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

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  z-index: 200;
`;

const ModalCard = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  width: min(480px, 100%);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalHeader = styled.div`
  h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #1f2937;
  }
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ModalFormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 600;
    color: #374151;
  }

  input[type='checkbox'] {
    width: auto;
  }
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const TextInput = styled.input`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 1rem;

  &:focus {
    border-color: #0d6efd;
    outline: none;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.12);
  }
`;

const Select = styled.select`
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
  font-size: 1rem;

  &:focus {
    border-color: #0d6efd;
    outline: none;
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.12);
  }
`;

const ErrorText = styled.span`
  color: #c92a2a;
  font-size: 0.85rem;
`;
