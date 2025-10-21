import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { cn } from '../../lib/cn';

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

  const tabButtonClass = (isActive: boolean) =>
    cn(
      'rounded-[18px] border-4 border-black px-5 py-3 text-sm font-semibold uppercase tracking-wider text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md focus:outline-none',
      isActive ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink/70',
    );

  const selectClass =
    'w-full rounded-[22px] border-4 border-black bg-white px-5 py-3 text-base font-semibold text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out focus:-translate-x-1 focus:-translate-y-1 focus:border-pixel-blue focus:shadow-pixel-md focus:outline-none';
  const primaryButtonClass =
    'pixel-button bg-pixel-blue text-white hover:text-white disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none';
  const chipButtonClass =
    'pixel-button px-4 py-2 bg-white text-pixel-ink hover:text-pixel-ink shadow-pixel-sm disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none';
  const dangerChipButtonClass =
    'pixel-button px-4 py-2 bg-pixel-red text-white hover:text-white shadow-pixel-sm disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none';
  const cardClass = 'pixel-box text-sm text-pixel-ink';
  const subtleCardClass = 'pixel-box';

  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    const siblingList = findCategorySiblings(node.type, node.parentId ?? null);
    const siblingIndex = siblingList.findIndex((item) => item.id === node.id);
    const isFirst = siblingIndex <= 0;
    const isLast = siblingIndex === siblingList.length - 1;

    return (
      <li
        key={node.id}
        className="border-4 border-black bg-white p-4 text-pixel-ink shadow-pixel-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2" style={{ paddingLeft: depth * 16 }}>
          <span className="text-sm font-bold uppercase text-pixel-ink">
            {node.name}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={chipButtonClass}
              onClick={() => handleAddCategory(node.type, node.id)}
            >
              하위 추가
            </button>
            <button
              type="button"
              className={chipButtonClass}
              onClick={() => handleRenameCategory(node)}
            >
              이름 변경
            </button>
            <button
              type="button"
              className={cn(chipButtonClass, 'w-9 justify-center')}
              onClick={() => handleReorderCategory(node, 'up')}
              disabled={isFirst}
            >
              ▲
            </button>
            <button
              type="button"
              className={cn(chipButtonClass, 'w-9 justify-center')}
              onClick={() => handleReorderCategory(node, 'down')}
              disabled={isLast}
            >
              ▼
            </button>
            <button
              type="button"
              className={dangerChipButtonClass}
              onClick={() => handleDeleteCategory(node)}
            >
              삭제
            </button>
          </div>
        </div>
        {node.children.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2 border-l-4 border-dashed border-pixel-yellow/40 pl-4">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  const selectedLedger = ledgers.find((ledger) => ledger.id === selectedLedgerId) ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div className="pixel-box text-pixel-ink">
        <h1 className="pixel-heading">가계부 상세 관리</h1>
        <p className="mt-2 text-sm text-pixel-ink/75">
          자산과 카테고리를 구성해 가계부 구조를 정리하세요.
        </p>
      </div>

      {isLedgerLoading ? (
        <div className={cardClass}>가계부 정보를 불러오는 중입니다...</div>
      ) : editableLedgers.length === 0 ? (
        <div className={cardClass}>
          편집 가능한 가계부가 없습니다. 소유자에게 권한을 요청하거나 새로운 가계부를 생성하세요.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="pixel-box">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold uppercase text-pixel-ink" htmlFor="ledger-select">
                  가계부 선택
                </label>
                <select
                  id="ledger-select"
                  className={selectClass}
                  value={selectedLedgerId}
                  onChange={(event) => setSelectedLedgerId(event.target.value)}
                >
                  {editableLedgers.map((ledger) => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.name} ({ledger.role === LedgerMemberRole.OWNER ? '소유자' : '편집 권한'})
                    </option>
                  ))}
                </select>
              </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-[24px] border-4 border-black bg-white p-1 md:mt-0">
              <button type="button" className={tabButtonClass(activeTab === 'assets')} onClick={() => setActiveTab('assets')}>
                자산 관리
              </button>
              <button type="button" className={tabButtonClass(activeTab === 'categories')} onClick={() => setActiveTab('categories')}>
                카테고리 관리
              </button>
            </div>
          </div>
        </div>

          {activeTab === 'assets' ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-pixel-ink">
                <h2 className="pixel-heading">자산 그룹 및 자산</h2>
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => handleOpenGroupModal('create')}
                >
                  새 자산 그룹 추가
                </button>
              </div>
              {isAssetsLoading ? (
                <div className={cardClass}>자산 정보를 불러오는 중입니다...</div>
              ) : assetGroups.length === 0 ? (
                <div className={cardClass}>
                  아직 자산 그룹이 없습니다. “새 자산 그룹 추가” 버튼으로 첫 번째 그룹을 만들어보세요.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {assetGroups.map((group, index) => (
                    <div key={group.id} className={subtleCardClass}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-bold uppercase text-pixel-ink">
                            {group.name}
                          </h3>
                          <p className="text-sm uppercase text-pixel-ink/70">
                            {assetGroupTypeLabel[group.type]}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={chipButtonClass}
                            onClick={() => handleOpenGroupModal('edit', group)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className={cn(chipButtonClass, 'w-9 justify-center')}
                            onClick={() => handleReorderGroups(group.id, 'up')}
                            disabled={index === 0}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className={cn(chipButtonClass, 'w-9 justify-center')}
                            onClick={() => handleReorderGroups(group.id, 'down')}
                            disabled={index === assetGroups.length - 1}
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className={dangerChipButtonClass}
                            onClick={() => handleDeleteGroup(group)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {group.assets.length === 0 ? (
                        <div className="mt-4 border-4 border-dashed border-pixel-yellow/50 bg-white px-4 py-6 text-center text-sm text-pixel-ink">
                          아직 자산이 없습니다. 아래 버튼으로 첫 자산을 추가하세요.
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3">
                          {group.assets.map((asset, assetIndex) => (
                            <div
                              key={asset.id}
                              className="flex flex-col gap-3 border-4 border-black bg-white p-4 text-pixel-ink shadow-pixel-sm md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="text-sm font-bold uppercase text-pixel-ink">
                                  {asset.name}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-3 text-xs uppercase text-pixel-ink/80">
                                  <span>{assetTypeLabel[asset.type]}</span>
                                  <span>초기 금액 {asset.initialAmount.toLocaleString()}원</span>
                                  <span>{asset.includeInNetWorth ? '순자산 포함' : '순자산 제외'}</span>
                                  {asset.billingDay ? (
                                    <span>결제일 매월 {asset.billingDay}일</span>
                                  ) : null}
                                  {asset.upcomingPaymentAmount ? (
                                    <span>
                                      결제 예정 {asset.upcomingPaymentAmount.toLocaleString()}원
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={chipButtonClass}
                                  onClick={() => handleOpenAssetModal('edit', group, asset)}
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  className={cn(chipButtonClass, 'w-9 justify-center')}
                                  onClick={() => handleReorderAssets(group, asset.id, 'up')}
                                  disabled={assetIndex === 0}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className={cn(chipButtonClass, 'w-9 justify-center')}
                                  onClick={() => handleReorderAssets(group, asset.id, 'down')}
                                  disabled={assetIndex === group.assets.length - 1}
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  className={dangerChipButtonClass}
                                  onClick={() => handleDeleteAsset(asset)}
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          className={primaryButtonClass}
                          onClick={() => handleOpenAssetModal('create', group)}
                        >
                          자산 추가
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-pixel-ink">
                <h2 className="pixel-heading text-2xl">
                  카테고리 구조
                </h2>
                {selectedLedger ? (
                  <span className="text-sm font-semibold uppercase text-pixel-ink/60">
                    {selectedLedger.currency} · 정산 기준일 매월 {selectedLedger.monthStartDay}일 · 참여 {selectedLedger.memberCount}명
                  </span>
                ) : null}
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className={cardClass}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="pixel-heading text-xl">
                      수입 카테고리
                    </h3>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => handleAddCategory(CategoryType.INCOME)}
                    >
                      새 수입 카테고리
                    </button>
                  </div>
                  {isCategoriesLoading ? (
                    <div className="border-4 border-dashed border-pixel-yellow/50 bg-white px-4 py-6 text-center text-sm text-pixel-ink">
                      카테고리를 불러오는 중입니다...
                    </div>
                  ) : categories.income.length === 0 ? (
                    <div className="border-4 border-dashed border-pixel-yellow/50 bg-white px-4 py-6 text-center text-sm text-pixel-ink">
                      수입 카테고리가 없습니다. 첫 번째 항목을 추가해보세요.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {categories.income.map((node) => renderCategoryNode(node))}
                    </ul>
                  )}
                </div>
                <div className={cardClass}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="pixel-heading text-xl">
                      지출 카테고리
                    </h3>
                    <button
                      type="button"
                      className={primaryButtonClass}
                      onClick={() => handleAddCategory(CategoryType.EXPENSE)}
                    >
                      새 지출 카테고리
                    </button>
                  </div>
                  {isCategoriesLoading ? (
                    <div className="border-4 border-dashed border-pixel-yellow/50 bg-white px-4 py-6 text-center text-sm text-pixel-ink">
                      카테고리를 불러오는 중입니다...
                    </div>
                  ) : categories.expense.length === 0 ? (
                    <div className="border-4 border-dashed border-pixel-yellow/50 bg-white px-4 py-6 text-center text-sm text-pixel-ink">
                      지출 카테고리가 없습니다. 첫 번째 항목을 추가해보세요.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {categories.expense.map((node) => renderCategoryNode(node))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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
    </div>
  );
}

const modalOverlayClass = 'fixed inset-0 z-[200] flex items-center justify-center bg-[#05060c]/70 px-4';
const modalCardClass = 'pixel-box w-full max-w-lg text-pixel-ink';
const modalSectionClass = 'flex flex-col gap-4';
const modalLabelClass = 'text-sm font-semibold uppercase text-pixel-ink';
const modalInputClass =
  'w-full rounded-[22px] border-4 border-black bg-white px-5 py-3 text-base font-semibold text-pixel-ink shadow-pixel-sm transition-transform duration-200 ease-out placeholder:text-pixel-ink/35 focus:-translate-x-1 focus:-translate-y-1 focus:border-pixel-blue focus:shadow-pixel-md focus:outline-none';
const modalErrorClass = 'text-xs font-semibold uppercase text-pixel-red';
const modalPrimaryButtonClass =
  'pixel-button bg-pixel-blue text-white hover:text-white disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none';
const modalSecondaryButtonClass =
  'pixel-button px-4 py-2 bg-white text-pixel-ink hover:text-pixel-ink shadow-pixel-sm disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none';

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
    <div className={modalOverlayClass}>
      <div className={modalCardClass}>
        <h3 className="pixel-heading">
          {mode === 'create' ? '새 자산 그룹' : '자산 그룹 수정'}
        </h3>
        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit(submitHandler)}>
          <div className={modalSectionClass}>
            <label className={modalLabelClass}>이름</label>
            <input className={modalInputClass} type="text" {...register('name')} />
            {errors.name ? <p className={modalErrorClass}>{errors.name.message}</p> : null}
          </div>
          <div className={modalSectionClass}>
            <label className={modalLabelClass}>유형</label>
            <select className={modalInputClass} {...register('type')}>
              {Object.values(AssetGroupType).map((type) => (
                <option key={type} value={type}>
                  {assetGroupTypeLabel[type]}
                </option>
              ))}
            </select>
            {errors.type ? <p className={modalErrorClass}>{errors.type.message}</p> : null}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={modalPrimaryButtonClass} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
    <div className={modalOverlayClass}>
      <div className={modalCardClass}>
        <h3 className="pixel-heading">
          {mode === 'create' ? '새 자산 추가' : '자산 수정'}
        </h3>
        <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit(submitHandler)}>
          <div className={modalSectionClass}>
            <label className={modalLabelClass}>이름</label>
            <input className={modalInputClass} type="text" {...register('name')} />
            {errors.name ? <p className={modalErrorClass}>{errors.name.message}</p> : null}
          </div>
          <div className={modalSectionClass}>
            <label className={modalLabelClass}>그룹</label>
            <select className={modalInputClass} {...register('groupId')}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {errors.groupId ? <p className={modalErrorClass}>{errors.groupId.message}</p> : null}
          </div>
          <div className={modalSectionClass}>
            <label className={modalLabelClass}>유형</label>
            <select className={modalInputClass} {...register('type')}>
              {Object.values(AssetType).map((type) => (
                <option key={type} value={type}>
                  {assetTypeLabel[type]}
                </option>
              ))}
            </select>
            {errors.type ? <p className={modalErrorClass}>{errors.type.message}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={modalSectionClass}>
              <label className={modalLabelClass}>초기 금액</label>
              <input
                className={modalInputClass}
                type="number"
                {...register('initialAmount', { valueAsNumber: true })}
              />
              {errors.initialAmount ? (
                <p className={modalErrorClass}>{errors.initialAmount.message}</p>
              ) : null}
            </div>
            <div className={modalSectionClass}>
              <label className={modalLabelClass}>결제 예정 금액</label>
              <input
                className={modalInputClass}
                type="number"
                {...register('upcomingPaymentAmount', { valueAsNumber: true })}
              />
              {errors.upcomingPaymentAmount ? (
                <p className={modalErrorClass}>{errors.upcomingPaymentAmount.message as string}</p>
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={modalSectionClass}>
              <label className={modalLabelClass}>결제일 (신용카드)</label>
              <input
                className={modalInputClass}
                type="number"
                {...register('billingDay', { valueAsNumber: true })}
                disabled={selectedType !== AssetType.CREDIT_CARD}
              />
              {errors.billingDay ? (
                <p className={modalErrorClass}>{errors.billingDay.message as string}</p>
              ) : null}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 border-4 border-black bg-white text-pixel-ink focus:outline-none focus:ring-0"
                {...register('includeInNetWorth')}
              />
              <span className="text-sm font-bold uppercase text-pixel-ink">
                순자산에 포함
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className={modalSecondaryButtonClass} onClick={onClose}>
              취소
            </button>
            <button type="submit" className={modalPrimaryButtonClass} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
