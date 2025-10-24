import React from 'react';
import {
  Control,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { TransactionType, Tag } from '@garangbi/types';
import {
  AttachmentPreview,
  AssetOption,
  TransactionFormValues,
} from '../../types';
import { FormTypeSelector } from './FormTypeSelector';
import { PrimaryFields } from './PrimaryFields';
import { SplitSection } from './SplitSection';
import { TagSection } from './TagSection';
import { AttachmentSection } from './AttachmentSection';
import { FormFooter } from './FormFooter';

type CategoryContextSetter = (context: { target: 'primary' } | { target: 'split'; index: number }) => void;

interface TransactionFormContentProps {
  onSubmit: () => void;
  register: UseFormRegister<TransactionFormValues>;
  control: Control<TransactionFormValues>;
  errors: FieldErrors<TransactionFormValues>;
  fieldClassName: (hasError: boolean) => string;
  amountFormatted: string;
  amountMismatch: boolean;
  typeValue: TransactionType;
  assets: AssetOption[];
  assetIdValue: string;
  primaryCategoryLabel?: string;
  onOpenAssetModal: () => void;
  setCategoryContext: CategoryContextSetter;
  isSplitMode: boolean;
  onToggleSplitMode: (value: boolean) => void;
  splitsArray: UseFieldArrayReturn<TransactionFormValues, 'splits'>;
  onFillSplitAmount: (index: number) => void;
  categoryLabelMap: Record<string, string>;
  splitTotal: number;
  remainder: number;
  splitValues: TransactionFormValues['splits'];
  setValue: UseFormSetValue<TransactionFormValues>;
  tagOptions: Tag[];
  attachments: AttachmentPreview[];
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  hasShownAttachmentNotice: boolean;
  onOpenOcr: () => void;
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}

export function TransactionFormContent({
  onSubmit,
  register,
  control,
  errors,
  fieldClassName,
  amountFormatted,
  amountMismatch,
  typeValue,
  assets,
  assetIdValue,
  primaryCategoryLabel,
  onOpenAssetModal,
  setCategoryContext,
  isSplitMode,
  onToggleSplitMode,
  splitsArray,
  onFillSplitAmount,
  categoryLabelMap,
  splitTotal,
  remainder,
  splitValues,
  setValue,
  tagOptions,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  hasShownAttachmentNotice,
  onOpenOcr,
  onCancel,
  isSaving,
  submitLabel,
}: TransactionFormContentProps) {
  return (
    <form onSubmit={onSubmit} className="grid gap-6 px-8 pb-8">
      <FormTypeSelector typeValue={typeValue} register={register} onOpenOcr={onOpenOcr} />

      <PrimaryFields
        register={register}
        errors={errors}
        fieldClassName={fieldClassName}
        amountFormatted={amountFormatted}
        amountMismatch={amountMismatch}
        typeValue={typeValue}
        assets={assets}
        assetIdValue={assetIdValue}
        categoryLabel={primaryCategoryLabel}
        onOpenAssetModal={onOpenAssetModal}
        onOpenCategoryPicker={() => setCategoryContext({ target: 'primary' })}
      />

      <SplitSection
        isSplitMode={isSplitMode}
        onToggleSplitMode={onToggleSplitMode}
        splitsArray={splitsArray}
        register={register}
        errors={errors}
        onFillSplitAmount={onFillSplitAmount}
        setCategoryContext={setCategoryContext}
        categoryLabelMap={categoryLabelMap}
        splitTotal={splitTotal}
        remainder={remainder}
        amountMismatch={amountMismatch}
        values={splitValues}
      />

      <TagSection control={control} setValue={setValue} tagOptions={tagOptions} />

      <AttachmentSection
        attachments={attachments}
        onFileSelect={onFileSelect}
        onRemoveAttachment={onRemoveAttachment}
        hasShownAttachmentNotice={hasShownAttachmentNotice}
      />

      <FormFooter
        onCancel={onCancel}
        isSaving={isSaving}
        submitLabel={submitLabel}
        disabled={amountMismatch || isSaving}
      />
    </form>
  );
}
