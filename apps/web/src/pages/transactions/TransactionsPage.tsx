import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useForm,
  useFieldArray,
} from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuthStore } from '@stores/authStore';
import { cn } from '../../lib/cn';
import {
  ledgerService,
  notificationService,
  transactionsService,
} from '@services/index';
import {
  Transaction,
  TransactionComment,
  TransactionType,
  Tag,
  CategoryNode,
} from '@garangbi/types';
import {
  VIEW_OPTIONS,
  ViewOption,
  MAX_ATTACHMENTS,
} from './constants';
import {
  AttachmentPreview,
  AssetOption,
  CategoryTree,
  FilterState,
  TransactionFormValues,
} from './types';
import {
  createDefaultFormValues,
  extractUniqueTags,
  flattenCategoryTree,
  formatCurrency,
  getTodayDateTime,
  groupAssetsByGroupName,
  groupTransactionsByDate,
  isSupportedImage,
  revokeAttachmentPreviews,
  toLocalDateTimeInputValue,
} from './utils';
import { FilterPanel } from './components/FilterPanel';
import { TransactionListView } from './components/TransactionListView';
import { TransactionCalendarView } from './components/TransactionCalendarView';
import { TransactionFormSheet } from './components/TransactionFormSheet';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { DailyTransactionsModal } from './components/DailyTransactionsModal';

const PAGE_SIZE = 20;

const defaultFilters: FilterState = {
  types: [],
  assetIds: [],
  categoryIds: [],
  tagIds: [],
};

type DailyModalState = {
  date: string;
  items: Transaction[];
};

export function TransactionsPage() {
  const { user } = useAuthStore();
  const ledgerId = user?.mainLedgerId ?? '';

  const [view, setView] = useState<ViewOption>(VIEW_OPTIONS.LIST);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef<Transaction[]>([]);
  const commentChannelRef = useRef<BroadcastChannel | null>(null);
  const [pageState, setPageState] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree | null>(null);
  const [flatCategories, setFlatCategories] = useState<CategoryNode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [hasShownAttachmentNotice, setHasShownAttachmentNotice] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dailyModal, setDailyModal] = useState<DailyModalState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasUnreadComments, setHasUnreadComments] = useState(false);
  const [latestCommentTransactionId, setLatestCommentTransactionId] = useState<string | null>(null);

  const form = useForm<TransactionFormValues>({
    defaultValues: createDefaultFormValues(),
  });

  const {
    control,
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = form;

  const splitsArray = useFieldArray({ control, name: 'splits' });

  const amountValue = watch('amount');
  const typeValue = watch('type');
  const splitValues = watch('splits');
  const assetIdValue = watch('assetId');
  const categoryIdValue = watch('categoryId');
  const attachmentsValue = watch('attachments');

  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  const groupedAssets = useMemo(
    () => groupAssetsByGroupName(assets),
    [assets],
  );

  const splitTotal = useMemo(() => {
    if (!splitValues?.length) {
      return 0;
    }
    return splitValues.reduce((sum, split) => {
      const value = typeof split.amount === 'number' ? split.amount : Number(split.amount) || 0;
      return sum + value;
    }, 0);
  }, [splitValues]);

  const amountMismatch = useMemo(() => {
    if (!isSplitMode || !splitValues?.length) {
      return false;
    }
    if (amountValue === '' || typeof amountValue !== 'number' || Number.isNaN(amountValue)) {
      return true;
    }
    return splitTotal !== amountValue;
  }, [isSplitMode, splitValues, amountValue, splitTotal]);

  const hasMore = pageState.page < pageState.totalPages;

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
    const currentAssetId = getValues('assetId');
    if (!currentAssetId && assets.length) {
      setValue('assetId', assets[0].id);
    }
  }, [assets, getValues, setValue]);

  const loadLedgerMeta = useCallback(async () => {
    if (!ledgerId) {
      return;
    }
    try {
      const [assetGroups, categoryData] = await Promise.all([
        ledgerService.getAssetGroups(ledgerId),
        ledgerService.getCategories(ledgerId),
      ]);

      const assetOptions: AssetOption[] = assetGroups
        .flatMap((group) =>
          group.assets.map((asset) => ({
            id: asset.id,
            name: asset.name,
            groupName: group.name,
          })),
        )
        .sort((a, b) => {
          const byGroup = a.groupName.localeCompare(b.groupName);
          if (byGroup !== 0) {
            return byGroup;
          }
          return a.name.localeCompare(b.name);
        });

      setAssets(assetOptions);
      setCategoryTree(categoryData);
      setFlatCategories([
        ...flattenCategoryTree(categoryData.income),
        ...flattenCategoryTree(categoryData.expense),
      ]);
    } catch (error) {
      notificationService.error('자산 및 카테고리 정보를 불러오지 못했습니다.');
    }
  }, [ledgerId]);

  useEffect(() => {
    loadLedgerMeta();
  }, [loadLedgerMeta]);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).BroadcastChannel) {
      return;
    }
    const channel = new BroadcastChannel('garangbi-transactions-comments');
    commentChannelRef.current = channel;
    const handleMessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (!data || data.type !== 'comment:created') {
        return;
      }
      if (data.ledgerId && data.ledgerId !== ledgerId) {
        return;
      }
      if (data.authorId && data.authorId === user?.id) {
        return;
      }
      setHasUnreadComments(true);
      setLatestCommentTransactionId(data.transactionId ?? null);
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [ledgerId, user?.id]);

  const loadTransactions = useCallback(
    async (page: number, append: boolean) => {
      if (!ledgerId) {
        return;
      }

      const query = {
        ...filters,
        startDate: filters.startDate,
        endDate: filters.endDate,
        page,
        pageSize: PAGE_SIZE,
      };

      try {
        if (append) {
          setIsMoreLoading(true);
        } else {
          setIsInitialLoading(true);
        }

        const response = await transactionsService.listTransactions(ledgerId, query);

        let nextTransactions: Transaction[] = [];
        setTransactions((prev) => {
          nextTransactions = append ? [...prev, ...response.items] : response.items;
          return nextTransactions;
        });
        transactionsRef.current = nextTransactions;
        setTags(extractUniqueTags(nextTransactions));

        setPageState({
          page: response.page,
          totalPages: response.totalPages,
          total: response.total,
        });
      } catch (error) {
        notificationService.error('거래 데이터를 불러오지 못했습니다.');
      } finally {
        if (append) {
          setIsMoreLoading(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [ledgerId, filters],
  );

  useEffect(() => {
    loadTransactions(1, false);
  }, [loadTransactions]);

  const handleLoadMore = () => {
    if (!hasMore || isMoreLoading) {
      return;
    }
    loadTransactions(pageState.page + 1, true);
  };

  const resetFormState = useCallback(() => {
    revokeAttachmentPreviews(attachmentsValue ?? []);
    setIsSplitMode(false);
    setEditingTransactionId(null);
    setFormMode('create');
    setHasShownAttachmentNotice(false);
    const defaults = createDefaultFormValues();
    defaults.assetId = assets[0]?.id ?? '';
    reset(defaults);
  }, [attachmentsValue, assets, reset]);

  const handleOpenForm = () => {
    if (!assets.length) {
      toast.warn('자산 정보를 불러오고 있습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    resetFormState();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    resetFormState();
    setIsFormOpen(false);
  };

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
    if (typeof amountValue !== 'number' || Number.isNaN(amountValue)) {
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) {
      return;
    }

    const selectedFiles = Array.from(files);
    const acceptedFiles = selectedFiles.filter((file) => isSupportedImage(file));
    const rejectedFiles = selectedFiles.filter((file) => !isSupportedImage(file));

    if (rejectedFiles.length) {
      toast.warn('jpg, png, heic 형식의 이미지 파일만 첨부할 수 있습니다.');
    }

    if (!acceptedFiles.length) {
      event.target.value = '';
      return;
    }

    const current = attachmentsValue ?? [];
    if (current.length + acceptedFiles.length > MAX_ATTACHMENTS) {
      toast.warn(`이미지는 최대 ${MAX_ATTACHMENTS}개까지 첨부할 수 있습니다.`);
      event.target.value = '';
      return;
    }

    if (!hasShownAttachmentNotice) {
      toast.info('이미지 업로드는 추후 지원 예정입니다. 현재는 미리보기만 제공합니다.');
      setHasShownAttachmentNotice(true);
    }

    const previews: AttachmentPreview[] = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      mimeType: file.type,
      size: file.size,
      name: file.name,
    }));

    setValue('attachments', [...current, ...previews], { shouldDirty: true, shouldValidate: true });
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    const current = attachmentsValue ?? [];
    const target = current.find((file) => file.id === id);
    if (target?.file) {
      URL.revokeObjectURL(target.previewUrl);
    }
    const filtered = current.filter((file) => file.id !== id);
    setValue('attachments', filtered, { shouldDirty: true, shouldValidate: true });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    revokeAttachmentPreviews(attachmentsValue ?? []);

    const nextSplits =
      transaction.splits?.map((split) => ({
        categoryId: split.categoryId,
        amount: split.amount,
        memo: split.memo ?? '',
      })) ?? [];

    const nextTags = transaction.tags?.map((tag) => tag.name) ?? [];
    const nextAttachments: AttachmentPreview[] =
      transaction.attachments?.map((attachment) => ({
        id: attachment.id,
        previewUrl: attachment.thumbnailUrl ?? attachment.fileUrl,
        mimeType: attachment.mimeType,
        size: attachment.size,
        name: attachment.fileUrl.split('/').pop() ?? attachment.id,
        isRemote: true,
      })) ?? [];

    setFormMode('edit');
    setEditingTransactionId(transaction.id);
    setIsSplitMode(nextSplits.length > 0);
    setIsFormOpen(true);

    reset({
      type: transaction.type,
      transactionDate: toLocalDateTimeInputValue(transaction.transactionDate),
      amount: transaction.amount,
      assetId: transaction.assetId,
      relatedAssetId: transaction.relatedAssetId ?? null,
      categoryId: transaction.categoryId ?? undefined,
      memo: transaction.memo ?? '',
      note: transaction.note ?? '',
      tags: nextTags,
      splits: nextSplits,
      attachments: nextAttachments,
    });
  };

  const handleSelectTransaction = async (transaction: Transaction) => {
    if (!ledgerId) {
      return;
    }
    try {
      const detail = await transactionsService.getTransaction(ledgerId, transaction.id);
      setSelectedTransaction(detail);
      setIsDetailOpen(true);
      if (transaction.id === latestCommentTransactionId) {
        setHasUnreadComments(false);
        setLatestCommentTransactionId(null);
      }
    } catch (error) {
      toast.error('거래 상세를 불러오지 못했습니다.');
    }
  };

  const handleOpenDailyModal = (date: string) => {
    const items = transactionsRef.current.filter((transaction) => {
      return new Date(transaction.transactionDate).toISOString().slice(0, 10) === date;
    });
    setDailyModal({ date, items });
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!ledgerId) {
      return;
    }
    const confirmed = window.confirm('선택한 거래를 삭제하시겠어요?');
    if (!confirmed) {
      return;
    }
    try {
      setDeletingId(transaction.id);
      await transactionsService.deleteTransaction(ledgerId, transaction.id);
      toast.success('거래가 삭제되었습니다.');
      setTransactions((prev) => {
        const next = prev.filter((item) => item.id !== transaction.id);
        transactionsRef.current = next;
        setTags(extractUniqueTags(next));
        return next;
      });
      setPageState((prev) => ({
        ...prev,
        total: Math.max(prev.total - 1, 0),
      }));
      if (selectedTransaction?.id === transaction.id) {
        setIsDetailOpen(false);
        setSelectedTransaction(null);
      }
    } catch (error) {
      toast.error('거래 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  const syncTransactionsAfterMutation = useCallback(async () => {
    await loadTransactions(1, false);
  }, [loadTransactions]);

  const onSubmit = async (values: TransactionFormValues) => {
    if (!ledgerId) {
      toast.error('가계부 정보를 찾을 수 없습니다.');
      return;
    }

    if (values.type !== TransactionType.TRANSFER && !values.categoryId) {
      setError('categoryId', { type: 'manual', message: '카테고리를 선택해주세요.' });
      toast.error('카테고리를 선택해주세요.');
      return;
    }

    if (amountMismatch) {
      toast.error('분할 금액의 합계가 총 금액과 일치해야 합니다.');
      return;
    }

    const numericAmount =
      typeof values.amount === 'number' ? values.amount : Number(values.amount) || 0;

    if (!numericAmount) {
      setError('amount', { type: 'manual', message: '금액을 입력해주세요.' });
      toast.error('금액을 입력해주세요.');
      return;
    }

    const cleanedSplits =
      values.splits
        ?.map((split) => ({
          categoryId: split.categoryId,
          amount: typeof split.amount === 'number' ? split.amount : Number(split.amount) || 0,
          memo: split.memo?.trim() || undefined,
        }))
        .filter((split) => split.categoryId && split.amount > 0) ?? [];

    const cleanedTags = values.tags
      ?.map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      type: values.type,
      transactionDate: values.transactionDate || getTodayDateTime(),
      amount: numericAmount,
      assetId: values.assetId,
      relatedAssetId:
        values.type === TransactionType.TRANSFER ? values.relatedAssetId ?? null : null,
      categoryId: values.type === TransactionType.TRANSFER ? null : values.categoryId ?? null,
      memo: values.memo,
      note: values.note,
      tags: cleanedTags?.length ? cleanedTags : undefined,
      splits: cleanedSplits.length ? cleanedSplits : undefined,
    };

    try {
      setIsSaving(true);
      if (formMode === 'edit' && editingTransactionId) {
        await transactionsService.updateTransaction(ledgerId, editingTransactionId, payload);
        toast.success('거래가 성공적으로 수정되었습니다.', { autoClose: 2000 });
      } else {
        await transactionsService.createTransaction(ledgerId, payload);
        toast.success('거래가 성공적으로 저장되었습니다.', { autoClose: 2000 });
      }

      revokeAttachmentPreviews(values.attachments);
      handleCloseForm();
      await syncTransactionsAfterMutation();

      if (formMode === 'edit' && editingTransactionId) {
        try {
          const detail = await transactionsService.getTransaction(ledgerId, editingTransactionId);
          setSelectedTransaction(detail);
        } catch {
          setSelectedTransaction(null);
        }
      }
    } catch (error: any) {
      const message = error?.response?.data?.message ?? '거래 저장에 실패했습니다.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const addComment = async (transactionId: string, content: string) => {
    if (!ledgerId || !content.trim()) {
      return;
    }
    try {
      await transactionsService.createComment(ledgerId, transactionId, { content });
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
      await syncTransactionsAfterMutation();
      commentChannelRef.current?.postMessage({
        type: 'comment:created',
        transactionId,
        ledgerId,
        authorId: user?.id ?? null,
      });
    } catch (error) {
      toast.error('댓글 작성에 실패했습니다.');
    }
  };

  const updateComment = async (transactionId: string, comment: TransactionComment) => {
    if (!ledgerId) {
      return;
    }
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
    if (!ledgerId) {
      return;
    }
    try {
      await transactionsService.deleteComment(ledgerId, transactionId, commentId);
      const detail = await transactionsService.getTransaction(ledgerId, transactionId);
      setSelectedTransaction(detail);
    } catch {
      toast.error('댓글 삭제에 실패했습니다.');
    }
  };

  const handleEditFromDetail = (transaction: Transaction) => {
    setIsDetailOpen(false);
    handleEditTransaction(transaction);
  };

  const handleNotificationClick = async () => {
    if (!ledgerId) {
      setHasUnreadComments(false);
      return;
    }
    if (!latestCommentTransactionId) {
      setHasUnreadComments(false);
      return;
    }
    try {
      const detail = await transactionsService.getTransaction(ledgerId, latestCommentTransactionId);
      setSelectedTransaction(detail);
      setIsDetailOpen(true);
    } catch (error) {
      toast.error('새 댓글 상세를 불러오지 못했습니다.');
    } finally {
      setHasUnreadComments(false);
      setLatestCommentTransactionId(null);
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
              onClick={handleNotificationClick}
              className={cn(
                'relative flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                hasUnreadComments ? 'bg-pixel-purple text-white' : 'bg-white text-pixel-ink',
              )}
            >
              <span aria-hidden="true" role="img">
                🔔
              </span>
              <span>알림</span>
              {hasUnreadComments ? (
                <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-pixel-red text-[0px]" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={handleNotificationClick}
              className={cn(
                'relative flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                hasUnreadComments ? 'bg-pixel-purple text-white' : 'bg-white text-pixel-ink',
              )}
            >
              <span aria-hidden="true" role="img">
                🔔
              </span>
              <span>알림</span>
              {hasUnreadComments ? (
                <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 items-center justify-center rounded-full bg-pixel-red text-[0px]" />
              ) : null}
            </button>
            <button
              type="button"
              className={`rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition ${view === VIEW_OPTIONS.LIST ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink'}`}
              onClick={() => setView(VIEW_OPTIONS.LIST)}
            >
              목록 보기
            </button>
            <button
              type="button"
              className={cn(
                'rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                view === VIEW_OPTIONS.CALENDAR
                  ? 'bg-pixel-blue text-white'
                  : 'bg-white text-pixel-ink',
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
          categories={flatCategories}
          tagOptions={tags}
        />
      </header>

      <section className="flex-1 rounded-3xl border border-black bg-white p-4 shadow-pixel-md">
        {isInitialLoading ? (
          <div className="flex min-h-[200px] items-center justify-center text-sm text-pixel-ink/60">
            데이터를 불러오는 중입니다...
          </div>
        ) : view === VIEW_OPTIONS.LIST ? (
          <TransactionList
            groupedTransactions={groupedTransactions}
            onSelect={handleSelectTransaction}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={isMoreLoading}
            deletingId={deletingId}
          />
        ) : (
          <TransactionCalendar
            transactions={transactions}
            onSelectDate={handleOpenDailyModal}
          />
        )}
      </section>

  {isFormOpen ? (
        <TransactionFormSheet
          isOpen={isFormOpen}
          mode={formMode}
          isSaving={isSaving}
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
          amountFormatted={formatCurrency(
            typeof amountValue === 'number' && !Number.isNaN(amountValue) ? amountValue : 0,
          )}
          assets={assets}
          groupedAssets={groupedAssets}
          categoryTree={categoryTree}
          flatCategories={flatCategories}
          typeValue={typeValue}
          attachments={attachmentsValue ?? []}
          onFileSelect={handleFileSelect}
          onRemoveAttachment={removeAttachment}
          splitTotal={splitTotal}
          amountMismatch={amountMismatch}
          errors={errors}
          setValue={setValue}
          tagOptions={tags}
          hasShownAttachmentNotice={hasShownAttachmentNotice}
          assetIdValue={typeof assetIdValue === 'string' ? assetIdValue : ''}
          categoryIdValue={
            typeof categoryIdValue === 'string' || categoryIdValue === null
              ? categoryIdValue
              : undefined
          }
          splitValues={splitValues ?? []}
        />
      ) : null}

      {isDetailOpen && selectedTransaction ? (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setIsDetailOpen(false)}
          onEdit={handleEditFromDetail}
          onAddComment={addComment}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
        />
      ) : null}

      {dailyModal ? (
        <DailyTransactionsModal
          date={dailyModal.date}
          items={dailyModal.items}
          onClose={() => setDailyModal(null)}
          onSelect={handleSelectTransaction}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
          deletingId={deletingId}
        />
      ) : null}
    </div>
  );
}
