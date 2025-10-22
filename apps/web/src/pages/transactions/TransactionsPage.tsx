import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-toastify';
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
import { FilterPanel } from '../../components/transactions/FilterPanel';
import { TransactionList } from '../../components/transactions/TransactionList';
import { TransactionCalendar } from '../../components/transactions/TransactionCalendar';
import { TransactionFormSheet } from '../../components/transactions/TransactionFormSheet';
import { TransactionDayModal } from '../../components/transactions/TransactionDayModal';
import { TransactionDetailModal } from '../../components/transactions/TransactionDetailModal';
import {
  AssetGroupOption,
  AssetOption,
  AttachmentPreview,
  FilterState,
  SplitFormValue,
  TransactionFormValues,
} from '../../components/transactions/types';
import { formatCurrency } from '../../components/transactions/utils';

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

function clearAttachmentPreviews(attachments: AttachmentPreview[]) {
  attachments.forEach((attachment) => {
    if (attachment.file && attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
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
        categoryId:
          detail.type === TransactionType.TRANSFER ? undefined : detail.categoryId ?? undefined,
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
    } catch {
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
    } catch {
      toast.error('댓글 수정에 실패했습니다.');
    }
  };

  const deleteComment = async (transactionId: string, commentId: string) => {
    if (!ledgerId) return;
    try {
      await transactionsService.deleteComment(ledgerId, transactionId, commentId);
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
    } catch {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  const amountFormatted = formatCurrency(amountValue || 0);

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
              className={`rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition ${view === VIEW_OPTIONS.LIST ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink'}`}
              onClick={() => setView(VIEW_OPTIONS.LIST)}
            >
              목록 보기
            </button>
            <button
              type="button"
              className={`rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition ${view === VIEW_OPTIONS.CALENDAR ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink'}`}
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
        {isLoading && !transactions.length ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-pixel-ink/60">
            데이터를 불러오는 중입니다...
          </div>
        ) : view === VIEW_OPTIONS.LIST ? (
          <TransactionList
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
          <TransactionCalendar
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
          amountFormatted={amountFormatted}
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
