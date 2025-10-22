import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  file?: File;
  previewUrl: string;
  mimeType: string;
  size: number;
  name: string;
  isExisting?: boolean;
  remoteUrl?: string;
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

interface AssetGroupOption {
  id: string;
  name: string;
  assets: AssetOption[];
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

const PAGE_SIZE = 20;

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

function toLocalDateTimeInput(value: string) {
  const source = new Date(value);
  const offset = source.getTimezoneOffset();
  const local = new Date(source.getTime() - offset * 60000);
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroupOption[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [hasMore, setHasMore] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<{ date: string; items: Transaction[] } | null>(null);

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
    if (attachment.file && attachment.previewUrl) {
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

  const fetchLedgerMeta = useCallback(async () => {
    if (!ledgerId) {
      return;
    }

    try {
      const [assetGroupResponse, categoryTree] = await Promise.all([
        ledgerService.getAssetGroups(ledgerId),
        ledgerService.getCategories(ledgerId),
      ]);

      const groupOptions: AssetGroupOption[] = assetGroupResponse.map((group) => ({
        id: group.id,
        name: group.name,
        assets: group.assets.map((asset) => ({
          id: asset.id,
          name: asset.name,
          groupName: group.name,
        })),
      }));
      const assetOptions: AssetOption[] = groupOptions.flatMap((group) => group.assets);

      setAssetGroups(groupOptions);
      setAssets(assetOptions);
      setCategories([
        ...flattenCategoryTree(categoryTree.income),
        ...flattenCategoryTree(categoryTree.expense),
      ]);
    } catch (error) {
      notificationService.error('가계부 정보를 불러오지 못했습니다.');
    }
  }, [ledgerId]);

  useEffect(() => {
    fetchLedgerMeta();
  }, [fetchLedgerMeta]);

  const fetchTransactions = useCallback(
    async (pageToLoad = 1, replace = false) => {
      if (!ledgerId) return;

      if (replace) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await transactionsService.listTransactions(ledgerId, {
          ...filters,
          page: pageToLoad,
          pageSize: PAGE_SIZE,
        });

        setPagination({ page: response.page, totalPages: response.totalPages });
        setHasMore(response.page < response.totalPages);

        setTransactions((prev) => {
          const next = replace
            ? response.items
            : [
                ...prev,
                ...response.items.filter(
                  (incoming) => !prev.some((existing) => existing.id === incoming.id),
                ),
              ];
          const tagMap = new Map<string, Tag>();
          next.forEach((transaction) => {
            transaction.tags?.forEach((tag) => {
              tagMap.set(tag.id, tag);
            });
          });
          setTags(Array.from(tagMap.values()));
          return next;
        });
      } catch (error) {
        notificationService.error('거래 데이터를 불러오지 못했습니다.');
      } finally {
        if (replace) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [filters, ledgerId],
  );

  useEffect(() => {
    if (!ledgerId) {
      return;
    }
    setTransactions([]);
    setTags([]);
    setPagination({ page: 1, totalPages: 1 });
    setHasMore(false);
    fetchTransactions(1, true);
  }, [ledgerId, filters, fetchTransactions]);

  useEffect(() => {
    const currentAssetId = getValues('assetId');
    if (currentAssetId) {
      return;
    }
    const fallbackAssetId = assetGroups[0]?.assets[0]?.id ?? assets[0]?.id;
    if (fallbackAssetId) {
      setValue('assetId', fallbackAssetId);
    }
  }, [assetGroups, assets, getValues, setValue]);

  const groupedTransactions = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const handleLoadMoreTransactions = useCallback(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }
    fetchTransactions(pagination.page + 1, false);
  }, [fetchTransactions, hasMore, isLoading, isLoadingMore, pagination.page]);

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
    setEditingTransactionId(null);
    setIsSplitMode(false);
    setIsFormOpen(true);
    reset({
      type: TransactionType.EXPENSE,
      transactionDate: getTodayDateTime(),
      amount: '',
      assetId: assetGroups[0]?.assets[0]?.id ?? assets[0]?.id ?? '',
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
    setEditingTransactionId(null);
    setIsSplitMode(false);
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
      const payload = {
        type: values.type,
        transactionDate: values.transactionDate,
        amount: Number(values.amount),
        assetId: values.assetId,
        relatedAssetId:
          values.type === TransactionType.TRANSFER ? values.relatedAssetId ?? null : null,
        categoryId: values.type === TransactionType.TRANSFER ? null : values.categoryId ?? null,
        memo: values.memo,
        note: values.note,
        tags: cleanedTags.length ? cleanedTags : undefined,
        splits: cleanedSplits.length ? cleanedSplits : undefined,
      };

      if (editingTransactionId) {
        await transactionsService.updateTransaction(ledgerId, editingTransactionId, payload);
      } else {
        await transactionsService.createTransaction(ledgerId, payload);
      }

      toast.success(
        editingTransactionId
          ? '거래가 성공적으로 수정되었습니다.'
          : '거래가 성공적으로 저장되었습니다.',
        { autoClose: 2000 },
      );
      clearAttachmentPreviews(values.attachments);
      setIsSplitMode(false);
      setEditingTransactionId(null);
      handleCloseForm();
      reset();

      await fetchTransactions(1, true);
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

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

    const { validFiles, invalidFiles } = Array.from(files).reduce(
      (acc, file) => {
        const mime = (file.type || '').toLowerCase();
        const filename = file.name.toLowerCase();
        const mimeAllowed = allowedMimeTypes.has(mime);
        const extensionAllowed = allowedExtensions.some((ext) => filename.endsWith(ext));
        if (mimeAllowed || extensionAllowed) {
          acc.validFiles.push(file);
        } else {
          acc.invalidFiles.push(file);
        }
        return acc;
      },
      { validFiles: [] as File[], invalidFiles: [] as File[] },
    );

    if (invalidFiles.length) {
      toast.warn('지원하지 않는 이미지 형식이 제외되었습니다. JPG, PNG, HEIC만 업로드할 수 있습니다.');
    }

    if (!validFiles.length) {
      event.target.value = '';
      return;
    }

    const remainingSlots = Math.max(0, 5 - attachmentsValue.length);
    if (remainingSlots <= 0) {
      toast.warn('이미지는 최대 5개까지 첨부할 수 있습니다. 기존 이미지를 삭제해주세요.');
      event.target.value = '';
      return;
    }

    const acceptedFiles = validFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < validFiles.length) {
      toast.warn('이미지는 최대 5개까지 첨부할 수 있습니다. 일부 파일이 제외되었습니다.');
    }

    const previews: AttachmentPreview[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      mimeType: file.type,
      size: file.size,
      name: file.name,
      isExisting: false,
    }));

    setValue('attachments', [...attachmentsValue, ...previews], { shouldDirty: true });
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

  const handleEditTransaction = async (transaction: Transaction) => {
    if (!ledgerId) return;
    try {
      const detail = await transactionsService.getTransaction(ledgerId, transaction.id);
      clearAttachmentPreviews(attachmentsValue);

      const splitInputs: SplitFormValue[] =
        detail.splits?.map((split) => ({
          categoryId: split.categoryId,
          amount: split.amount,
          memo: split.memo ?? '',
        })) ?? [];

      const attachmentPreviews: AttachmentPreview[] =
        detail.attachments?.map((attachment) => {
          const previewUrl = attachment.thumbnailUrl ?? attachment.fileUrl;
          const inferredName = attachment.fileUrl.split('/').pop() ?? attachment.id;
          return {
            id: attachment.id,
            previewUrl,
            mimeType: attachment.mimeType,
            size: attachment.size,
            name: inferredName,
            isExisting: true,
            remoteUrl: attachment.fileUrl,
          };
        }) ?? [];

      reset({
        type: detail.type,
        transactionDate: toLocalDateTimeInput(detail.transactionDate),
        amount: detail.amount,
        assetId: detail.assetId,
        relatedAssetId: detail.relatedAssetId ?? null,
        categoryId: detail.type === TransactionType.TRANSFER ? undefined : detail.categoryId ?? undefined,
        memo: detail.memo ?? '',
        note: detail.note ?? '',
        tags: detail.tags?.map((tag) => tag.name) ?? [],
        splits: splitInputs,
        attachments: attachmentPreviews,
      });
      setEditingTransactionId(detail.id);
      setIsSplitMode(splitInputs.length > 0);
      setIsFormOpen(true);
    } catch (error) {
      toast.error('거래 정보를 불러오지 못했습니다.');
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!ledgerId) return;
    const confirmed = window.confirm('선택한 거래를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      await transactionsService.deleteTransaction(ledgerId, transaction.id);
      toast.success('거래가 삭제되었습니다.');
      setTransactions((prev) => {
        const next = prev.filter((item) => item.id !== transaction.id);
        const tagMap = new Map<string, Tag>();
        next.forEach((item) => {
          item.tags?.forEach((tag) => {
            tagMap.set(tag.id, tag);
          });
        });
        setTags(Array.from(tagMap.values()));
        return next;
      });
      if (selectedTransaction?.id === transaction.id) {
        setSelectedTransaction(null);
        setIsDetailOpen(false);
      }
      await fetchTransactions(1, true);
    } catch (error) {
      toast.error('거래 삭제에 실패했습니다.');
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
          assetGroups={assetGroups}
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
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onLoadMore={handleLoadMoreTransactions}
            hasMore={hasMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
          />
        ) : (
          <TransactionCalendarView
            transactions={transactions}
            onSelectDate={(date) => {
              const items = transactions.filter((transaction) => {
                const isoDate = new Date(transaction.transactionDate).toISOString().slice(0, 10);
                return isoDate === date;
              });
              setDayModal({
                date,
                items: items.sort(
                  (a, b) =>
                    new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
                ),
              });
            }}
          />
        )}
      </section>

      {isFormOpen ? (
        <TransactionFormSheet
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmit(onSubmit)}
          isEditing={Boolean(editingTransactionId)}
          register={register}
          control={control}
          splitsArray={splitsArray}
          isSplitMode={isSplitMode}
          onToggleSplitMode={handleToggleSplitMode}
          onFillSplitAmount={handleFillSplitAmount}
          amountValue={amountValue}
          amountFormatted={formatCurrency(amountValue || 0)}
          assetGroups={assetGroups}
          categories={categories}
          typeValue={typeValue}
          availableTags={tags}
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
          currentUserId={user?.id ?? null}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTransaction(null);
          }}
          onAddComment={addComment}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
        />
      ) : null}

      {dayModal ? (
        <TransactionDayModal
          date={dayModal.date}
          transactions={dayModal.items}
          onClose={() => setDayModal(null)}
          onSelect={(transaction) => {
            setDayModal(null);
            void handleSelectTransaction(transaction);
          }}
          onEdit={(transaction) => {
            setDayModal(null);
            void handleEditTransaction(transaction);
          }}
          onDelete={(transaction) => {
            setDayModal(null);
            void handleDeleteTransaction(transaction);
          }}
        />
      ) : null}
    </div>
  );
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  assetGroups: AssetGroupOption[];
  assets: AssetOption[];
  categories: CategoryNode[];
  tagOptions: Tag[];
}

function FilterPanel({
  filters,
  onChange,
  assetGroups,
  assets,
  categories,
  tagOptions,
}: FilterPanelProps) {
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
              {assetGroups.map((group) => (
                <optgroup key={group.id} label={group.name}>
                  {group.assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </optgroup>
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
        {filters.assetIds.map((id) => {
          const asset = assets.find((item) => item.id === id);
          return (
            <button
              key={id}
              className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
              onClick={() => handleChipRemove('assetIds', id)}
            >
              자산: {asset ? `${asset.groupName} · ${asset.name}` : id}
            </button>
          );
        })}
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
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
}

function TransactionListView({
  groupedTransactions,
  onSelect,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
}: TransactionListViewProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const groups = useMemo(
    () =>
      Object.entries(groupedTransactions).sort(
        (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
      ),
    [groupedTransactions],
  );

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

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
                  className="group relative flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
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
                  <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
                    <button
                      type="button"
                      className="rounded-full border border-black bg-white px-2 py-1 text-[10px] font-semibold uppercase shadow-pixel-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(transaction);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-black bg-pixel-red px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-pixel-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(transaction);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div ref={loadMoreRef} className="h-1 w-full" />
      {isLoadingMore ? (
        <div className="flex items-center justify-center gap-2 text-xs text-pixel-ink/60">
          더 불러오는 중입니다...
        </div>
      ) : null}
      {!hasMore && !isLoading ? (
        <div className="text-center text-xs text-pixel-ink/50">마지막 거래입니다.</div>
      ) : null}
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
  isEditing: boolean;
  register: UseFormRegister<TransactionFormValues>;
  control: Control<TransactionFormValues>;
  splitsArray: UseFieldArrayReturn<TransactionFormValues, 'splits'>;
  isSplitMode: boolean;
  onToggleSplitMode: (value: boolean) => void;
  onFillSplitAmount: (index: number) => void;
  amountValue: number | '';
  amountFormatted: string;
  assetGroups: AssetGroupOption[];
  categories: CategoryNode[];
  typeValue: TransactionType;
  availableTags: Tag[];
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
  isEditing,
  register,
  control,
  splitsArray,
  isSplitMode,
  onToggleSplitMode,
  onFillSplitAmount,
  amountValue,
  amountFormatted,
  assetGroups,
  categories,
  typeValue,
  availableTags,
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
          <h2 className="pixel-heading text-2xl">
            {isEditing ? '거래 수정' : '새 거래 입력'}
          </h2>
          <p className="mt-2 text-sm text-pixel-ink/70">
            거래 유형을 선택하고 필요한 정보를 입력해주세요. 필수 항목을 모두 채워야 저장할 수
            있습니다.
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
                className={cn(
                  'rounded-2xl border-2 px-4 py-2 text-sm outline-none transition',
                  errors.transactionDate
                    ? 'border-pixel-red focus:border-pixel-red'
                    : 'border-black focus:border-pixel-blue',
                )}
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
                className={cn(
                  'rounded-2xl border-2 px-4 py-2 text-sm outline-none transition',
                  errors.amount ? 'border-pixel-red focus:border-pixel-red' : 'border-black focus:border-pixel-blue',
                )}
                {...register('amount', {
                  valueAsNumber: true,
                  required: '금액을 입력해주세요.',
                })}
              />
              <span className="text-xs text-pixel-ink/60">{amountFormatted} 원</span>
              {errors.amount ? (
                <span className="text-xs text-pixel-red">
                  {errors.amount.message ?? '금액을 입력해주세요.'}
                </span>
              ) : null}
              {amountMismatch ? (
                <span className="text-xs text-pixel-red">
                  분할 금액의 합이 {amountFormatted}원과 일치해야 합니다.
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase text-pixel-ink/70">자산</label>
              <select
                className={cn(
                  'rounded-2xl border-2 px-4 py-2 text-sm outline-none transition',
                  errors.assetId ? 'border-pixel-red focus:border-pixel-red' : 'border-black focus:border-pixel-blue',
                )}
                {...register('assetId', { required: true })}
              >
                <option value="">자산 선택</option>
                {assetGroups.map((group) => (
                  <optgroup key={group.id} label={group.name}>
                    {group.assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </optgroup>
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
                  className={cn(
                    'rounded-2xl border-2 px-4 py-2 text-sm outline-none transition',
                    errors.relatedAssetId
                      ? 'border-pixel-red focus:border-pixel-red'
                      : 'border-black focus:border-pixel-blue',
                  )}
                  {...register('relatedAssetId', { required: true })}
                >
                  <option value="">자산 선택</option>
                  {assetGroups.map((group) => (
                    <optgroup key={group.id} label={group.name}>
                      {group.assets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.relatedAssetId ? (
                  <span className="text-xs text-pixel-red">상대 자산을 선택해주세요.</span>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase text-pixel-ink/70">카테고리</label>
                <select
                  className={cn(
                    'rounded-2xl border-2 px-4 py-2 text-sm outline-none transition',
                    errors.categoryId
                      ? 'border-pixel-red focus:border-pixel-red'
                      : 'border-black focus:border-pixel-blue',
                  )}
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
              <TagInput
                control={control}
                name="tags"
                setValue={setValue}
                availableTags={availableTags}
              />
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
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
              multiple
              onChange={onFileSelect}
            />
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
              {isEditing ? '수정하기' : '저장하기'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

interface TagInputProps {
  control: Control<TransactionFormValues>;
  name: 'tags';
  setValue: UseFormSetValue<TransactionFormValues>;
  availableTags: Tag[];
}

function TagInput({ control, name, setValue, availableTags }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setHighlightIndex(0);
  }, [inputValue]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const currentTags = field.value ?? [];
        const normalizedQuery = inputValue.startsWith('#')
          ? inputValue.slice(1).toLowerCase()
          : inputValue.toLowerCase();
        const trimmedQuery = normalizedQuery.trim();
        const seenNames = new Set<string>();
        const suggestions = inputValue.startsWith('#')
          ? availableTags.filter((tag) => {
              const tagName = tag.name.trim();
              if (!tagName) return false;
              const normalizedTagName = tagName.toLowerCase();
              const isDuplicate = currentTags.some(
                (current) => current.toLowerCase() === normalizedTagName,
              );
              if (isDuplicate) {
                return false;
              }
              if (seenNames.has(normalizedTagName)) {
                return false;
              }
              seenNames.add(normalizedTagName);
              if (!trimmedQuery) {
                return true;
              }
              return normalizedTagName.includes(trimmedQuery);
            })
          : [];
        const showSuggestions = isFocused && suggestions.length > 0 && inputValue.startsWith('#');

        const addTag = (rawValue: string) => {
          const cleaned = rawValue.trim().replace(/^#+/, '');
          if (!cleaned) {
            setInputValue('');
            return;
          }
          const exists = currentTags.some(
            (current) => current.toLowerCase() === cleaned.toLowerCase(),
          );
          if (exists) {
            setInputValue('');
            return;
          }
          const next = [...currentTags, cleaned];
          setValue(name, next, { shouldDirty: true });
          field.onChange(next);
          setInputValue('');
        };

        const removeTag = (index: number) => {
          const next = currentTags.filter((_, idx) => idx !== index);
          setValue(name, next, { shouldDirty: true });
          field.onChange(next);
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (showSuggestions && suggestions.length) {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlightIndex((prev) => (prev + 1) % suggestions.length);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlightIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              const target = suggestions[highlightIndex] ?? suggestions[0];
              if (target) {
                addTag(target.name);
              }
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setIsFocused(false);
              return;
            }
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            addTag(inputValue);
            return;
          }

          if (event.key === ' ' && !showSuggestions) {
            event.preventDefault();
            addTag(inputValue);
            return;
          }

          if (event.key === 'Backspace' && !inputValue && currentTags.length) {
            event.preventDefault();
            removeTag(currentTags.length - 1);
          }
        };

        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {currentTags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full bg-pixel-purple/20 px-3 py-1 text-xs text-pixel-purple"
                >
                  #{tag}
                  <button
                    type="button"
                    className="text-[10px] text-pixel-purple/80"
                    onClick={() => removeTag(index)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="relative w-full">
              <input
                type="text"
                className="w-full rounded-2xl border-2 border-black px-3 py-2 text-sm"
                placeholder="#태그"
                value={inputValue}
                autoComplete="off"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
              />
              {showSuggestions ? (
                <ul className="absolute left-0 right-0 top-full z-20 mt-2 max-h-44 overflow-y-auto rounded-2xl border-2 border-black bg-white shadow-pixel-lg">
                  {suggestions.map((tag, index) => {
                    const isActive = index === highlightIndex;
                    return (
                      <li key={tag.id}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-center justify-between px-3 py-2 text-sm text-pixel-ink transition',
                            isActive ? 'bg-pixel-purple/15 font-semibold' : 'hover:bg-pixel-purple/10',
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addTag(tag.name);
                          }}
                          onMouseEnter={() => setHighlightIndex(index)}
                        >
                          <span>#{tag.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}

interface TransactionDayModalProps {
  date: string;
  transactions: Transaction[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

function TransactionDayModal({
  date,
  transactions,
  onClose,
  onSelect,
  onEdit,
  onDelete,
}: TransactionDayModalProps) {
  const [year, month, day] = date.split('-').map(Number);
  const displayDate = year && month && day ? new Date(year, month - 1, day) : new Date();
  const summary = calculateDailySummary(transactions);

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm font-semibold uppercase text-pixel-ink"
          onClick={onClose}
        >
          닫기
        </button>
        <header className="flex flex-col gap-2">
          <h3 className="pixel-heading text-xl">
            {displayDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h3>
          <div className="flex items-center gap-3 text-xs uppercase text-pixel-ink/70">
            <span className="rounded-full bg-pixel-green/20 px-2 py-1 text-pixel-green">
              +{formatCurrency(summary.income)}
            </span>
            <span className="rounded-full bg-pixel-red/20 px-2 py-1 text-pixel-red">
              -{formatCurrency(summary.expense)}
            </span>
          </div>
        </header>

        <section className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
          {transactions.length ? (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="text-left text-sm font-semibold text-pixel-ink"
                    onClick={() => onSelect(transaction)}
                  >
                    {transaction.memo || '제목 없음'}
                  </button>
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
                <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
                  <button
                    type="button"
                    className="rounded-full border border-black bg-white px-2 py-1 text-[10px] font-semibold uppercase shadow-pixel-sm"
                    onClick={() => onEdit(transaction)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-black bg-pixel-red px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-pixel-sm"
                    onClick={() => onDelete(transaction)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-black/30 bg-pixel-dark/5 text-sm text-pixel-ink/60">
              선택한 날짜에 등록된 거래가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface TransactionDetailModalProps {
  transaction: Transaction;
  currentUserId: string | null;
  onClose: () => void;
  onAddComment: (transactionId: string, content: string) => void;
  onUpdateComment: (transactionId: string, comment: TransactionComment) => void;
  onDeleteComment: (transactionId: string, commentId: string) => void;
}

function TransactionDetailModal({
  transaction,
  currentUserId,
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
            {transaction.comments?.map((comment) => {
              const isMine = currentUserId ? comment.userId === currentUserId : false;
              const displayName = comment.user?.nickname ?? comment.user?.email ?? '사용자';
              const avatarLabel = displayName.trim().charAt(0).toUpperCase() || '유';
              const renderAsEditing = isMine && editingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-black bg-white px-3 py-2 text-sm shadow-pixel-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-pixel-ink/70">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-black bg-pixel-purple/15 text-[11px] font-semibold text-pixel-purple">
                        {avatarLabel}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-pixel-ink">{displayName}</span>
                        <span className="text-[10px] text-pixel-ink/60">
                          {new Date(comment.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    {isMine ? (
                      <div className="flex gap-2 text-[10px] text-pixel-ink/60">
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
                    ) : null}
                  </div>
                  {renderAsEditing ? (
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
                </div>
              );
            })}
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
