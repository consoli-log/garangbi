import React, { useEffect, useMemo, useState } from 'react';
import {
  useForm,
  Controller,
  useFieldArray,
  UseFieldArrayReturn,
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
} from 'react-hook-form';
import { toast } from 'react-toastify';
import { cn } from '../../lib/cn';
import { useAuthStore } from '@stores/authStore';
import {
  ledgerService,
  transactionsService,
  notificationService,
} from '@services/index';
import {
  Transaction,
  TransactionType,
  TransactionComment,
  Tag,
  CategoryNode,
  CategoryType,
} from '@garangbi/types';

interface SplitFormValue {
  categoryId: string;
  amount: number | '';
  memo?: string;
}

interface AttachmentPreview {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  size: number;
  name: string;
}

interface TransactionFormValues {
  type: TransactionType;
  transactionDate: string;
  amount: number | '';
  assetId: string;
  relatedAssetId?: string | null;
  categoryId?: string | null;
  memo?: string;
  note?: string;
  tags: string[];
  splits: SplitFormValue[];
  attachments: AttachmentPreview[];
}

interface FilterState {
  startDate?: string;
  endDate?: string;
  types: TransactionType[];
  assetIds: string[];
  categoryIds: string[];
  tagIds: string[];
}

interface AssetOption {
  id: string;
  name: string;
  groupName: string;
}

const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: '수입', value: TransactionType.INCOME },
  { label: '지출', value: TransactionType.EXPENSE },
  { label: '이체', value: TransactionType.TRANSFER },
];

const VIEW_OPTIONS = {
  LIST: 'LIST',
  CALENDAR: 'CALENDAR',
} as const;

type ViewOption = (typeof VIEW_OPTIONS)[keyof typeof VIEW_OPTIONS];

const defaultFilters: FilterState = {
  types: [],
  assetIds: [],
  categoryIds: [],
  tagIds: [],
};

function formatCurrency(amount: number | '') {
  if (amount === '' || Number.isNaN(amount)) {
    return '0';
  }
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getTodayDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const key = new Date(transaction.transactionDate).toISOString().slice(0, 10);
    acc[key] = acc[key] ? [...acc[key], transaction] : [transaction];
    return acc;
  }, {});
}

function calculateDailySummary(transactions: Transaction[]) {
  return transactions.reduce<{ income: number; expense: number }>((acc, transaction) => {
    if (transaction.type === TransactionType.INCOME) {
      acc.income += transaction.amount;
    }
    if (transaction.type === TransactionType.EXPENSE) {
      acc.expense += transaction.amount;
    }
    return acc;
  }, { income: 0, expense: 0 });
}

function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCategoryTree(node.children));
    }
  });
  return result;
}

export function TransactionsPage() {
  const { user } = useAuthStore();
  const ledgerId = user?.mainLedgerId ?? '';

  const [view, setView] = useState<ViewOption>(VIEW_OPTIONS.LIST);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [hasShownAttachmentNotice, setHasShownAttachmentNotice] = useState(false);

  const form = useForm<TransactionFormValues>({
    defaultValues: {
      type: TransactionType.EXPENSE,
      transactionDate: getTodayDateTime(),
      amount: '',
      assetId: '',
      relatedAssetId: null,
      categoryId: undefined,
      memo: '',
      note: '',
      tags: [],
      splits: [],
      attachments: [],
    },
  });

  const {
    control,
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
    getValues,
  } = form;

  const splitsArray = useFieldArray({ control, name: 'splits' });

  const amountValue = watch('amount');
  const typeValue = watch('type');
  const splitValues = watch('splits');
  const attachmentsValue = watch('attachments');

  const splitTotal = useMemo(() => {
    if (!splitValues?.length) {
      return 0;
    }
    return splitValues.reduce((sum, split) => {
      const value = typeof split.amount === 'number' ? split.amount : 0;
      return sum + value;
    }, 0);
  }, [splitValues]);

const amountMismatch = useMemo(() => {
  if (!isSplitMode || !splitValues?.length) {
    return false;
  }
  if (amountValue === '' || typeof amountValue !== 'number') {
    return true;
  }
  return splitTotal !== amountValue;
}, [amountValue, splitTotal, splitValues, isSplitMode]);

const clearAttachmentPreviews = (attachments: AttachmentPreview[]) => {
  attachments.forEach((attachment) => {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
};

  useEffect(() => {
    if (typeValue === TransactionType.TRANSFER) {
      setValue('categoryId', undefined);
    } else {
      setValue('relatedAssetId', null);
    }
  }, [typeValue, setValue]);

  useEffect(() => {
    register('attachments');
  }, [register]);

  useEffect(() => {
    if (!ledgerId) {
      return;
    }

    const loadLedgerData = async () => {
      setIsLoading(true);
      try {
        const [assetGroups, categoryTree, listResponse] = await Promise.all([
          ledgerService.getAssetGroups(ledgerId),
          ledgerService.getCategories(ledgerId),
          transactionsService.listTransactions(ledgerId, {
            ...filters,
            startDate: filters.startDate,
            endDate: filters.endDate,
          }),
        ]);

        const assetOptions: AssetOption[] = assetGroups
          .flatMap((group) =>
            group.assets.map((asset) => ({
              id: asset.id,
              name: asset.name,
              groupName: group.name,
            })),
          )
          .sort((a, b) => a.groupName.localeCompare(b.groupName));

        setAssets(assetOptions);
        setCategories([
          ...flattenCategoryTree(categoryTree.income),
          ...flattenCategoryTree(categoryTree.expense),
        ]);
        setTransactions(listResponse.items);
        const mappedTags = listResponse.items
          .flatMap((transaction) => transaction.tags ?? [])
          .reduce<Record<string, Tag>>((acc, tag) => {
            acc[tag.id] = tag;
            return acc;
          }, {});
        setTags(Object.values(mappedTags));
      } catch (error) {
        notificationService.error('거래 데이터를 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLedgerData();
  }, [ledgerId, filters]);

  useEffect(() => {
    const currentAssetId = getValues('assetId');
    if (!currentAssetId && assets.length) {
      setValue('assetId', assets[0].id);
    }
  }, [assets, getValues, setValue]);

  const groupedTransactions = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const handleToggleSplitMode = (value: boolean) => {
    setIsSplitMode(value);
    if (value) {
      if (!splitsArray.fields.length) {
        splitsArray.append({ categoryId: '', amount: '' });
      }
    } else if (splitsArray.fields.length) {
      splitsArray.replace([]);
    }
  };

  const handleFillSplitAmount = (index: number) => {
    if (typeof amountValue !== 'number') {
      toast.warn('총 금액을 먼저 입력해주세요.');
      return;
    }
    const remainder = amountValue - splitValues.reduce((sum, split, idx) => {
      if (idx === index) {
        return sum;
      }
      const value = typeof split.amount === 'number' ? split.amount : Number(split.amount) || 0;
      return sum + value;
    }, 0);
    const nextAmount = remainder > 0 ? remainder : 0;
    setValue(`splits.${index}.amount`, nextAmount, { shouldDirty: true });
  };

  const handleOpenForm = () => {
    if (!assets.length) {
      toast.warn('자산 정보를 불러오고 있습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    clearAttachmentPreviews(attachmentsValue);
    setIsSplitMode(false);
    setIsFormOpen(true);
    reset({
      type: TransactionType.EXPENSE,
      transactionDate: getTodayDateTime(),
      amount: '',
      assetId: assets[0]?.id ?? '',
      relatedAssetId: null,
      categoryId: undefined,
      memo: '',
      note: '',
      tags: [],
      splits: [],
      attachments: [],
    });
  };

  const handleCloseForm = () => {
    clearAttachmentPreviews(attachmentsValue);
    setIsFormOpen(false);
  };

  const onSubmit = async (values: TransactionFormValues) => {
    if (!ledgerId) {
      toast.error('가계부를 선택할 수 없습니다.');
      return;
    }

    if (values.amount === '' || Number.isNaN(values.amount)) {
      toast.error('금액을 입력해주세요.');
      return;
    }

    if (!values.assetId) {
      toast.error('자산을 선택해주세요.');
      return;
    }

    if (!values.categoryId && values.type !== TransactionType.TRANSFER) {
      toast.error('카테고리를 선택해주세요.');
      return;
    }

    if (values.type === TransactionType.TRANSFER && !values.relatedAssetId) {
      toast.error('이체할 상대 자산을 선택해주세요.');
      return;
    }

    if (amountMismatch) {
      toast.error('분할 금액의 합계가 총 금액과 일치해야 합니다.');
      return;
    }

    try {
      setIsLoading(true);

      const cleanedTags = values.tags.filter((tag) => tag.trim().length > 0);
      const cleanedSplits = values.splits
        .filter((split) => split.categoryId && split.amount !== '')
        .map((split) => ({
          categoryId: split.categoryId,
          amount: Number(split.amount),
          memo: split.memo,
        }));
      await transactionsService.createTransaction(ledgerId, {
        type: values.type,
        transactionDate: values.transactionDate,
        amount: Number(values.amount),
        assetId: values.assetId,
        relatedAssetId: values.type === TransactionType.TRANSFER ? values.relatedAssetId ?? null : null,
        categoryId: values.type === TransactionType.TRANSFER ? null : values.categoryId ?? null,
        memo: values.memo,
        note: values.note,
        tags: cleanedTags.length ? cleanedTags : undefined,
        splits: cleanedSplits.length ? cleanedSplits : undefined,
      });

      toast.success('거래가 성공적으로 저장되었습니다.');
      clearAttachmentPreviews(values.attachments);
      setIsSplitMode(false);
      handleCloseForm();
      reset();

      const refreshed = await transactionsService.listTransactions(ledgerId, filters);
      setTransactions(refreshed.items);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '거래 저장에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    const current = [...attachmentsValue];
    const limitExceeded = current.length + files.length > 5;
    if (limitExceeded) {
      toast.warn('이미지는 최대 5개까지 첨부할 수 있습니다.');
      event.target.value = '';
      return;
    }

    if (!hasShownAttachmentNotice) {
      toast.info('이미지 업로드는 추후 지원 예정입니다. 현재는 미리보기만 제공합니다.');
      setHasShownAttachmentNotice(true);
    }

    const previews: AttachmentPreview[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      mimeType: file.type,
      size: file.size,
      name: file.name,
    }));

    setValue('attachments', [...current, ...previews], { shouldDirty: true });
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    const target = attachmentsValue.find((file) => file.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const filtered = attachmentsValue.filter((file) => file.id !== id);
    setValue('attachments', filtered, { shouldDirty: true });
  };

  const handleSelectTransaction = async (transaction: Transaction) => {
    if (!ledgerId) return;
    try {
      const detail = await transactionsService.getTransaction(ledgerId, transaction.id);
      setSelectedTransaction(detail);
      setIsDetailOpen(true);
    } catch {
      toast.error('거래 상세를 불러오지 못했습니다.');
    }
  };

  const addComment = async (transactionId: string, content: string) => {
    if (!ledgerId || !content.trim()) return;
    try {
      await transactionsService.createComment(ledgerId, transactionId, { content });
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
    } catch (error) {
      toast.error('댓글 작성에 실패했습니다.');
    }
  };

  const updateComment = async (transactionId: string, comment: TransactionComment) => {
    if (!ledgerId) return;
    try {
      await transactionsService.updateComment(ledgerId, transactionId, comment.id, {
        content: comment.content,
      });
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
    } catch (error) {
      toast.error('댓글 수정에 실패했습니다.');
    }
  };

  const deleteComment = async (transactionId: string, commentId: string) => {
    if (!ledgerId) return;
    try {
      await transactionsService.deleteComment(ledgerId, transactionId, commentId);
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
    } catch (error) {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-black bg-white p-6 shadow-pixel-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="pixel-heading text-pixel-ink">거래 관리</h1>
            <p className="text-sm text-pixel-ink/70">
              거래를 입력하고 조회할 수 있어요. 필터와 달력을 활용해 빠르게 확인해보세요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                view === VIEW_OPTIONS.LIST ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
              )}
              onClick={() => setView(VIEW_OPTIONS.LIST)}
            >
              목록 보기
            </button>
            <button
              type="button"
              className={cn(
                'rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                view === VIEW_OPTIONS.CALENDAR ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
              )}
              onClick={() => setView(VIEW_OPTIONS.CALENDAR)}
            >
              달력 보기
            </button>
            <button
              type="button"
              onClick={handleOpenForm}
              className="pixel-button bg-pixel-yellow text-pixel-ink hover:text-pixel-ink"
            >
              새 거래
            </button>
          </div>
        </div>
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          assets={assets}
          categories={categories}
          tagOptions={tags}
        />
      </header>

      <section className="flex-1 rounded-3xl border border-black bg-white p-4 shadow-pixel-md">
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-pixel-ink/60">
            데이터를 불러오는 중입니다...
          </div>
        ) : view === VIEW_OPTIONS.LIST ? (
          <TransactionListView
            groupedTransactions={groupedTransactions}
            onSelect={handleSelectTransaction}
          />
        ) : (
          <TransactionCalendarView
            transactions={transactions}
            onSelectDate={(date) => {
              const items = transactions.filter((transaction) =>
                new Date(transaction.transactionDate).toISOString().slice(0, 10) === date,
              );
              if (items.length) {
                handleSelectTransaction(items[0]);
              }
            }}
          />
        )}
      </section>

      {isFormOpen ? (
        <TransactionFormSheet
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit(onSubmit)}
          register={register}
          control={control}
          splitsArray={splitsArray}
          isSplitMode={isSplitMode}
          onToggleSplitMode={handleToggleSplitMode}
          onFillSplitAmount={handleFillSplitAmount}
          amountValue={amountValue}
          amountFormatted={formatCurrency(amountValue || 0)}
          assets={assets}
          categories={categories}
          typeValue={typeValue}
          attachments={attachmentsValue}
          onFileSelect={handleFileSelect}
          onRemoveAttachment={removeAttachment}
          splitTotal={splitTotal}
          amountMismatch={amountMismatch}
          errors={errors}
          setValue={setValue}
        />
      ) : null}

      {isDetailOpen && selectedTransaction ? (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTransaction(null);
          }}
          onAddComment={addComment}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
        />
      ) : null}
    </div>
  );
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  assets: AssetOption[];
  categories: CategoryNode[];
  tagOptions: Tag[];
}

function FilterPanel({ filters, onChange, assets, categories, tagOptions }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleValue = <T extends keyof FilterState>(key: T, value: FilterState[T]) => {
    const current = filters[key];
    if (Array.isArray(current) && Array.isArray(value)) {
      onChange({
        ...filters,
        [key]: value,
      });
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  const handleStartDateChange = (value?: string) => {
    if (filters.endDate && value && value > filters.endDate) {
      toast.warn('종료일보다 늦은 시작일은 선택할 수 없습니다.');
      return;
    }
    toggleValue('startDate', value);
  };

  const handleEndDateChange = (value?: string) => {
    if (filters.startDate && value && value < filters.startDate) {
      toast.warn('시작일 이후의 날짜를 선택해주세요.');
      return;
    }
    toggleValue('endDate', value);
  };

  const handleChipRemove = (type: keyof FilterState, id: string) => {
    const current = filters[type];
    if (!Array.isArray(current)) return;
    onChange({
      ...filters,
      [type]: current.filter((item) => item !== id),
    });
  };

  return (
    <div className="rounded-2xl border border-black bg-pixel-dark/10 p-4">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold text-pixel-ink"
      >
        <span>필터</span>
        <span>{isOpen ? '숨기기' : '펼치기'}</span>
      </button>

      {isOpen ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">기간</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
                value={filters.startDate ?? ''}
                onChange={(event) => handleStartDateChange(event.target.value || undefined)}
                max={filters.endDate}
              />
              <input
                type="date"
                className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
                value={filters.endDate ?? ''}
                onChange={(event) => handleEndDateChange(event.target.value || undefined)}
                min={filters.startDate}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">거래 유형</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((option) => {
                const active = filters.types.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={cn(
                      'rounded-full border-2 border-black px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm transition',
                      active ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
                    )}
                    onClick={() => {
                      const next = active
                        ? filters.types.filter((type) => type !== option.value)
                        : [...filters.types, option.value];
                      toggleValue('types', next);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">자산</label>
            <select
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                toggleValue('assetIds', [...filters.assetIds, value]);
              }}
            >
              <option value="">자산 선택</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.groupName} · {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">카테고리</label>
            <select
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                toggleValue('categoryIds', [...filters.categoryIds, value]);
              }}
            >
              <option value="">카테고리 선택</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">태그</label>
            <select
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                toggleValue('tagIds', [...filters.tagIds, value]);
              }}
            >
              <option value="">태그 선택</option>
              {tagOptions.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  #{tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.types.map((type) => (
          <button
            key={type}
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handleChipRemove('types', type)}
          >
            유형: {TYPE_OPTIONS.find((option) => option.value === type)?.label}
          </button>
        ))}
        {filters.assetIds.map((id) => (
          <button
            key={id}
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handleChipRemove('assetIds', id)}
          >
            자산: {assets.find((asset) => asset.id === id)?.name ?? id}
          </button>
        ))}
        {filters.categoryIds.map((id) => (
          <button
            key={id}
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handleChipRemove('categoryIds', id)}
          >
            카테고리: {categories.find((category) => category.id === id)?.name ?? id}
          </button>
        ))}
        {filters.tagIds.map((id) => (
          <button
            key={id}
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handleChipRemove('tagIds', id)}
          >
            태그: #{tagOptions.find((tag) => tag.id === id)?.name ?? id}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TransactionListViewProps {
  groupedTransactions: Record<string, Transaction[]>;
  onSelect: (transaction: Transaction) => void;
}

function TransactionListView({ groupedTransactions, onSelect }: TransactionListViewProps) {
  const groups = Object.entries(groupedTransactions).sort((a, b) =>
    new Date(b[0]).getTime() - new Date(a[0]).getTime(),
  );

  if (!groups.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-pixel-ink/60">
        표시할 거래가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, items]) => {
        const summary = calculateDailySummary(items);
        return (
          <div key={date} className="rounded-2xl border border-black bg-pixel-dark/5 p-4">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-pixel-ink">{date}</div>
              <div className="flex items-center gap-3 text-xs uppercase text-pixel-ink/70">
                <span className="rounded-full bg-pixel-green/20 px-2 py-1 text-pixel-green">
                  +{formatCurrency(summary.income)}
                </span>
                <span className="rounded-full bg-pixel-red/20 px-2 py-1 text-pixel-red">
                  -{formatCurrency(summary.expense)}
                </span>
              </div>
            </header>
            <ul className="flex flex-col gap-3">
              {items.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
                  onClick={() => onSelect(transaction)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-pixel-ink">
                      {transaction.memo || '제목 없음'}
                    </span>
                    <span className="text-xs text-pixel-ink/60">
                      {transaction.categoryId ? '카테고리 연결됨' : '카테고리 없음'}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {transaction.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-pixel-purple/15 px-2 py-1 text-[10px] uppercase text-pixel-purple"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn('text-base font-bold', {
                        'text-pixel-green': transaction.type === TransactionType.INCOME,
                        'text-pixel-red': transaction.type === TransactionType.EXPENSE,
                        'text-pixel-ink': transaction.type === TransactionType.TRANSFER,
                      })}
                    >
                      {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-pixel-ink/60">
                      {new Date(transaction.transactionDate).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface TransactionCalendarViewProps {
  transactions: Transaction[];
  onSelectDate: (date: string) => void;
}

function TransactionCalendarView({ transactions, onSelectDate }: TransactionCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarCells = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startWeekday = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const cells: {
      date: Date;
      iso: string;
      label: number;
      income: number;
      expense: number;
    }[] = [];

    for (let i = 0; i < startWeekday; i += 1) {
      const date = new Date(startOfMonth);
      date.setDate(date.getDate() - (startWeekday - i));
      const iso = date.toISOString().slice(0, 10);
      const dayTransactions = transactions.filter((transaction) =>
        transaction.transactionDate.slice(0, 10) === iso,
      );
      const summary = calculateDailySummary(dayTransactions);
      cells.push({ date, iso, label: date.getDate(), income: summary.income, expense: summary.expense });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const iso = date.toISOString().slice(0, 10);
      const dayTransactions = transactions.filter((transaction) =>
        transaction.transactionDate.slice(0, 10) === iso,
      );
      const summary = calculateDailySummary(dayTransactions);
      cells.push({ date, iso, label: day, income: summary.income, expense: summary.expense });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i += 1) {
      const date = new Date(endOfMonth);
      date.setDate(date.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      const dayTransactions = transactions.filter((transaction) =>
        transaction.transactionDate.slice(0, 10) === iso,
      );
      const summary = calculateDailySummary(dayTransactions);
      cells.push({ date, iso, label: date.getDate(), income: summary.income, expense: summary.expense });
    }

    return cells;
  }, [currentDate, transactions]);

  const monthLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold"
          onClick={() =>
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
          }
        >
          이전
        </button>
        <div className="text-sm font-semibold uppercase text-pixel-ink">{monthLabel}</div>
        <button
          type="button"
          className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold"
          onClick={() =>
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
          }
        >
          다음
        </button>
      </header>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-pixel-ink/70">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="rounded-full bg-pixel-dark/10 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell) => {
          const isCurrentMonth = cell.date.getMonth() === currentDate.getMonth();
          return (
            <button
              type="button"
              key={cell.iso}
              className={cn(
                'flex flex-col gap-1 rounded-2xl border border-black bg-white px-2 py-2 text-left shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
                !isCurrentMonth && 'opacity-50',
              )}
              onClick={() => onSelectDate(cell.iso)}
            >
              <span className="text-xs font-semibold text-pixel-ink">{cell.label}</span>
              {cell.income ? (
                <span className="text-[10px] text-pixel-green">
                  +{formatCurrency(cell.income)}
                </span>
              ) : null}
              {cell.expense ? (
                <span className="text-[10px] text-pixel-red">
                  -{formatCurrency(cell.expense)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TransactionFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  register: UseFormRegister<TransactionFormValues>;
  control: Control<TransactionFormValues>;
  splitsArray: UseFieldArrayReturn<TransactionFormValues, 'splits'>;
  isSplitMode: boolean;
  onToggleSplitMode: (value: boolean) => void;
  onFillSplitAmount: (index: number) => void;
  amountValue: number | '';
  amountFormatted: string;
  assets: AssetOption[];
  categories: CategoryNode[];
  typeValue: TransactionType;
  attachments: AttachmentPreview[];
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  splitTotal: number;
  amountMismatch: boolean;
  errors: FieldErrors<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
}

function TransactionFormSheet({
  isOpen,
  onClose,
  onSubmit,
  register,
  control,
  splitsArray,
  isSplitMode,
  onToggleSplitMode,
  onFillSplitAmount,
  amountValue,
  amountFormatted,
  assets,
  categories,
  typeValue,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  splitTotal,
  amountMismatch,
  errors,
  setValue,
}: TransactionFormSheetProps) {
  if (!isOpen) return null;

  const effectiveAmount = typeof amountValue === 'number' ? amountValue : 0;
  const remainder = effectiveAmount - splitTotal;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="relative flex w-full max-w-4xl flex-col gap-6 rounded-[36px] border-4 border-black bg-pixel-dark text-pixel-ink shadow-pixel-lg">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm font-semibold uppercase text-pixel-ink"
          onClick={onClose}
        >
          닫기
        </button>

        <div className="rounded-t-[32px] border-b-4 border-black bg-white px-8 py-6">
          <h2 className="pixel-heading text-2xl">새 거래 입력</h2>
          <p className="mt-2 text-sm text-pixel-ink/70">
            거래 유형을 선택하고 필요한 정보를 입력해주세요. 필수 항목은 모두 채우지 않으면 저장할 수 없습니다.
          </p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 px-8 pb-8">
          <section className="flex flex-wrap gap-2">
            {TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'cursor-pointer rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                  typeValue === option.value ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
                )}
              >
                <input
                  hidden
                  type="radio"
                  value={option.value}
                  {...register('type')}
                  defaultChecked={option.value === typeValue}
                />
                {option.label}
              </label>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">날짜 / 시간</label>
              <input
                type="datetime-local"
                className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                {...register('transactionDate', { required: true })}
              />
              {errors.transactionDate ? (
                <span className="text-xs text-pixel-red">날짜를 선택해주세요.</span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">금액</label>
              <input
                type="number"
                className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                {...register('amount', { valueAsNumber: true })}
              />
              <span className="text-xs text-pixel-ink/60">{amountFormatted} 원</span>
              {amountMismatch ? (
                <span className="text-xs text-pixel-red">
                  분할 금액의 합이 {amountFormatted}원과 일치해야 합니다.
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">자산</label>
              <select
                className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                {...register('assetId', { required: true })}
              >
                <option value="">자산 선택</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.groupName} · {asset.name}
                  </option>
                ))}
              </select>
              {errors.assetId ? (
                <span className="text-xs text-pixel-red">자산을 선택해주세요.</span>
              ) : null}
            </div>

            {typeValue === TransactionType.TRANSFER ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-pixel-ink/70">상대 자산</label>
                <select
                  className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                  {...register('relatedAssetId', { required: true })}
                >
                  <option value="">자산 선택</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.groupName} · {asset.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-pixel-ink/70">카테고리</label>
                <select
                  className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                  {...register('categoryId', { required: typeValue !== TransactionType.TRANSFER })}
                >
                  <option value="">카테고리 선택</option>
                  {categories
                    .filter((category) =>
                      typeValue === TransactionType.INCOME
                        ? category.type === CategoryType.INCOME
                        : category.type === CategoryType.EXPENSE,
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                {errors.categoryId ? (
                  <span className="text-xs text-pixel-red">카테고리를 선택해주세요.</span>
                ) : null}
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">태그</label>
              <TagInput control={control} name="tags" setValue={setValue} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">메모</label>
              <textarea
                rows={3}
                className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
                {...register('memo')}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">
                거래 쪼개기 (선택)
              </label>
              <button
                type="button"
                className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm"
                onClick={() => onToggleSplitMode(!isSplitMode)}
              >
                {isSplitMode ? '분할 종료' : '분할 사용'}
              </button>
            </div>
            {isSplitMode ? (
              <div className="flex flex-col gap-3">
                {splitsArray.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-2xl border-2 border-dashed border-black/40 px-4 py-3 md:grid-cols-3"
                  >
                    <select
                      className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
                      {...register(`splits.${index}.categoryId` as const, { required: true })}
                    >
                      <option value="">분류 선택</option>
                      {categories
                        .filter((category) => category.type === CategoryType.EXPENSE)
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
                      {...register(`splits.${index}.amount` as const, {
                        valueAsNumber: true,
                        required: true,
                      })}
                    />
                    <input
                      type="text"
                      placeholder="메모 (선택)"
                      className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
                      {...register(`splits.${index}.memo` as const)}
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-pixel-ink/60 md:col-span-3">
                      <button
                        type="button"
                        className="rounded-full border border-black bg-white px-2 py-1 text-[10px] uppercase"
                        onClick={() => onFillSplitAmount(index)}
                      >
                        잔액 채우기
                      </button>
                      <button
                        type="button"
                        className="text-left text-xs text-pixel-red"
                        onClick={() => splitsArray.remove(index)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="self-start rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm"
                  onClick={() =>
                    splitsArray.append({
                      categoryId: '',
                      amount: '',
                    })
                  }
                >
                  + 항목 추가
                </button>
                <div className="flex items-center justify-between text-xs text-pixel-ink/70">
                  <span>분할 합계: {formatCurrency(splitTotal)}원</span>
                  <span
                    className={cn(
                      remainder === 0 ? 'text-pixel-green' : 'text-pixel-red',
                    )}
                  >
                    잔액: {remainder >= 0 ? '' : '-'}{formatCurrency(Math.abs(remainder))}원
                  </span>
                </div>
                {amountMismatch ? (
                  <div className="rounded-2xl bg-pixel-red/10 px-3 py-2 text-xs text-pixel-red">
                    분할 금액의 합계가 총 금액과 일치해야 저장할 수 있습니다.
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="rounded-2xl bg-pixel-dark/10 px-3 py-2 text-xs text-pixel-ink/60">
                분할을 사용하지 않으면 전체 금액이 선택한 카테고리에 한 번에 기록됩니다.
              </p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">사진 첨부 (선택)</label>
            <input type="file" accept="image/*" multiple onChange={onFileSelect} />
            <p className="text-xs text-pixel-ink/50">
              현재는 테스트 환경으로, 이미지는 서버에 업로드되지 않고 미리보기로만 확인할 수 있습니다.
            </p>
            {attachments.length ? (
              <div className="flex flex-wrap gap-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-black"
                  >
                    <img
                      src={attachment.previewUrl}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
                      onClick={() => onRemoveAttachment(attachment.id)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <footer className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold uppercase shadow-pixel-sm"
            >
              취소
            </button>
            <button
              type="submit"
              className="pixel-button bg-pixel-blue text-white hover:text-white disabled:opacity-60"
              disabled={amountMismatch}
            >
              저장하기
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

interface TagInputProps {
  control: ReturnType<typeof useForm<TransactionFormValues>>['control'];
  name: 'tags';
  setValue: ReturnType<typeof useForm<TransactionFormValues>>['setValue'];
}

function TagInput({ control, name, setValue }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {field.value?.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-pixel-purple/20 px-3 py-1 text-xs text-pixel-purple"
              >
                #{tag}
                <button
                  type="button"
                  className="text-[10px] text-pixel-purple/80"
                  onClick={() => {
                    const next = field.value.filter((current, idx) => idx !== index);
                    setValue(name, next);
                    field.onChange(next);
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
            placeholder="#태그"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const trimmed = inputValue.trim().replace(/^#/, '');
                if (!trimmed) return;
                const next = [...(field.value ?? []), trimmed];
                setValue(name, next);
                field.onChange(next);
                setInputValue('');
              }
            }}
          />
        </div>
      )}
    />
  );
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onAddComment: (transactionId: string, content: string) => void;
  onUpdateComment: (transactionId: string, comment: TransactionComment) => void;
  onDeleteComment: (transactionId: string, commentId: string) => void;
}

function TransactionDetailModal({
  transaction,
  onClose,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: TransactionDetailModalProps) {
  const [commentValue, setCommentValue] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm font-semibold uppercase text-pixel-ink"
          onClick={onClose}
        >
          닫기
        </button>
        <header className="flex flex-col gap-2">
          <h3 className="pixel-heading text-xl">거래 상세</h3>
          <div className="text-sm text-pixel-ink/70">
            {new Date(transaction.transactionDate).toLocaleString('ko-KR')}
          </div>
          <div className="text-lg font-bold text-pixel-ink">
            {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
            {formatCurrency(transaction.amount)}원
          </div>
          <div className="flex flex-wrap gap-2">
            {transaction.tags?.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-pixel-purple/15 px-2 py-1 text-xs uppercase text-pixel-purple"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-dashed border-black/40 p-4 text-sm text-pixel-ink">
          <p>메모: {transaction.memo || '없음'}</p>
          <p>노트: {transaction.note || '없음'}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold uppercase text-pixel-ink">댓글</h4>
          <div className="flex flex-col gap-2">
            {transaction.comments?.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-black bg-white px-3 py-2 text-sm shadow-pixel-sm"
              >
                <div className="flex items-center justify-between text-xs text-pixel-ink/60">
                  <span>{comment.user?.nickname ?? '사용자'}</span>
                  <span>{new Date(comment.createdAt).toLocaleString('ko-KR')}</span>
                </div>
                {editingCommentId === comment.id ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                      className="flex-1 rounded-2xl border border-black px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      className="rounded-full border border-black bg-white px-3 py-1 text-xs"
                      onClick={() => {
                        onUpdateComment(transaction.id, {
                          ...comment,
                          content: editingValue,
                        });
                        setEditingCommentId(null);
                      }}
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-pixel-ink">{comment.content}</p>
                )}
                <div className="mt-2 flex gap-2 text-[10px] text-pixel-ink/60">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setEditingValue(comment.content);
                    }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(transaction.id, comment.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentValue}
              onChange={(event) => setCommentValue(event.target.value)}
              placeholder="새 댓글"
              className="flex-1 rounded-2xl border border-black px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="rounded-full border border-black bg-white px-3 py-2 text-xs font-semibold"
              onClick={() => {
                onAddComment(transaction.id, commentValue);
                setCommentValue('');
              }}
            >
              등록
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
