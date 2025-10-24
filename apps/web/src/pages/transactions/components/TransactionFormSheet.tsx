import React, { useMemo, useState } from 'react';
import {
  Control,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { TransactionType, Tag, CategoryNode } from '@garangbi/types';
import {
  AttachmentPreview,
  AssetOption,
  CategoryTree,
  GroupedAssetOption,
  TransactionFormValues,
} from '../types';
import { AssetPickerModal } from './form/AssetPickerModal';
import { CategoryPickerModal } from './form/CategoryPickerModal';
import { OcrScanModal } from './form/OcrScanModal';
import { cn } from '../../../lib/cn';
import { TransactionFormContent } from './form/TransactionFormContent';

interface TransactionFormSheetProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  isSaving: boolean;
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
  groupedAssets: GroupedAssetOption[];
  categoryTree: CategoryTree | null;
  flatCategories: CategoryNode[];
  typeValue: TransactionType;
  attachments: AttachmentPreview[];
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  splitTotal: number;
  amountMismatch: boolean;
  errors: FieldErrors<TransactionFormValues>;
  setValue: UseFormSetValue<TransactionFormValues>;
  tagOptions: Tag[];
  hasShownAttachmentNotice: boolean;
  assetIdValue: string;
  categoryIdValue?: string | null;
  splitValues: TransactionFormValues['splits'];
}

type CategoryContext =
  | { target: 'primary' }
  | { target: 'split'; index: number };

export function TransactionFormSheet({
  isOpen,
  mode,
  isSaving,
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
  groupedAssets,
  categoryTree,
  flatCategories,
  typeValue,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  splitTotal,
  amountMismatch,
  errors,
  setValue,
  tagOptions,
  hasShownAttachmentNotice,
  assetIdValue,
  categoryIdValue,
  splitValues,
}: TransactionFormSheetProps) {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [categoryContext, setCategoryContext] = useState<CategoryContext | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const categoryLabelMap = useMemo(() => {
    return flatCategories.reduce<Record<string, string>>((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {});
  }, [flatCategories]);

  const effectiveAmount = typeof amountValue === 'number' && !Number.isNaN(amountValue)
    ? amountValue
    : 0;
  const remainder = effectiveAmount - splitTotal;

  const fieldClassName = (hasError: boolean) =>
    cn(
      'rounded-2xl border-2 px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all duration-200',
      hasError ? 'border-pixel-red focus:ring-pixel-red/40' : 'border-black focus:ring-pixel-blue/40',
    );

  const handleSelectCategory = (categoryId: string) => {
    if (!categoryContext) {
      return;
    }
    if (categoryContext.target === 'primary') {
      setValue('categoryId', categoryId, { shouldDirty: true, shouldValidate: true });
    } else {
      setValue(`splits.${categoryContext.index}.categoryId`, categoryId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  if (!isOpen) {
    return null;
  }

  const formTitle = mode === 'edit' ? '거래 수정' : '새 거래 입력';
  const formDescription =
    mode === 'edit'
      ? '기존 거래 정보를 확인하고 필요한 항목을 업데이트한 뒤 저장해주세요.'
      : '거래 유형을 선택하고 필요한 정보를 입력해주세요. 필수 항목을 모두 채우지 않으면 저장할 수 없습니다.';
  const submitLabel = mode === 'edit' ? '수정하기' : '저장하기';
  const primaryCategoryLabel = categoryIdValue ? categoryLabelMap[categoryIdValue] : undefined;

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
          <h2 className="pixel-heading text-2xl">{formTitle}</h2>
          <p className="mt-2 text-sm text-pixel-ink/70">{formDescription}</p>
        </div>

        <TransactionFormContent
          onSubmit={onSubmit}
          register={register}
          control={control}
          errors={errors}
          fieldClassName={fieldClassName}
          amountFormatted={amountFormatted}
          amountMismatch={amountMismatch}
          typeValue={typeValue}
          assets={assets}
          assetIdValue={assetIdValue}
          primaryCategoryLabel={primaryCategoryLabel}
          onOpenAssetModal={() => setIsAssetModalOpen(true)}
          setCategoryContext={setCategoryContext}
          isSplitMode={isSplitMode}
          onToggleSplitMode={onToggleSplitMode}
          splitsArray={splitsArray}
          onFillSplitAmount={onFillSplitAmount}
          categoryLabelMap={categoryLabelMap}
          splitTotal={splitTotal}
          remainder={remainder}
          splitValues={splitValues}
          setValue={setValue}
          tagOptions={tagOptions}
          attachments={attachments}
          onFileSelect={onFileSelect}
          onRemoveAttachment={onRemoveAttachment}
          hasShownAttachmentNotice={hasShownAttachmentNotice}
          onOpenOcr={() => setIsOcrModalOpen(true)}
          onCancel={onClose}
          isSaving={isSaving}
          submitLabel={submitLabel}
        />
      </div>

      <AssetPickerModal
        isOpen={isAssetModalOpen}
        assets={groupedAssets}
        selectedId={assetIdValue}
        onSelect={(assetId) =>
          setValue('assetId', assetId, { shouldDirty: true, shouldValidate: true })
        }
        onClose={() => setIsAssetModalOpen(false)}
      />

      <CategoryPickerModal
        isOpen={Boolean(categoryContext) && typeValue !== TransactionType.TRANSFER}
        tree={categoryTree}
        transactionType={typeValue}
        selectedId={
          categoryContext?.target === 'split' && typeof categoryContext.index === 'number'
            ? splitValues?.[categoryContext.index]?.categoryId ?? undefined
            : categoryIdValue ?? undefined
        }
        onSelect={handleSelectCategory}
        onClose={() => setCategoryContext(null)}
      />

      <OcrScanModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onConfirm={(result) => {
          if (typeof result.amount === 'number') {
            setValue('amount', result.amount, { shouldDirty: true, shouldValidate: true });
          }
          if (result.transactionDate) {
            setValue('transactionDate', result.transactionDate, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
          if (result.memo) {
            setValue('memo', result.memo, { shouldDirty: true });
          }
        }}
      />
    </div>
  );
}
