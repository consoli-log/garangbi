import React from 'react';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
import { TransactionType } from '@garangbi/types';
import { TransactionFormValues, AssetOption } from '../../types';

interface PrimaryFieldsProps {
  register: UseFormRegister<TransactionFormValues>;
  errors: FieldErrors<TransactionFormValues>;
  fieldClassName: (hasError: boolean) => string;
  amountFormatted: string;
  amountMismatch: boolean;
  typeValue: TransactionType;
  assets: AssetOption[];
  assetIdValue: string;
  categoryLabel?: string;
  onOpenAssetModal: () => void;
  onOpenCategoryPicker: () => void;
}

export function PrimaryFields({
  register,
  errors,
  fieldClassName,
  amountFormatted,
  amountMismatch,
  typeValue,
  assets,
  assetIdValue,
  categoryLabel,
  onOpenAssetModal,
  onOpenCategoryPicker,
}: PrimaryFieldsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase text-pixel-ink/70">날짜 / 시간</label>
        <input
          type="datetime-local"
          className={fieldClassName(Boolean(errors.transactionDate))}
          aria-invalid={Boolean(errors.transactionDate)}
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
          inputMode="decimal"
          className={fieldClassName(Boolean(errors.amount))}
          aria-invalid={Boolean(errors.amount)}
          {...register('amount', {
            valueAsNumber: true,
            required: '금액을 입력해주세요.',
            validate: (value) =>
              value !== '' && !Number.isNaN(value) ? true : '금액을 입력해주세요.',
          })}
        />
        <span className="text-xs text-pixel-ink/60">{amountFormatted} 원</span>
        {errors.amount ? (
          <span className="text-xs text-pixel-red">
            {typeof errors.amount.message === 'string'
              ? errors.amount.message
              : '금액을 입력해주세요.'}
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
        <button
          type="button"
          className={fieldClassName(Boolean(errors.assetId))}
          onClick={onOpenAssetModal}
        >
          {assets.find((asset) => asset.id === assetIdValue)?.name ?? '자산 선택'}
        </button>
        <input type="hidden" {...register('assetId', { required: '자산을 선택해주세요.' })} />
        {errors.assetId ? (
          <span className="text-xs text-pixel-red">자산을 선택해주세요.</span>
        ) : null}
      </div>

      {typeValue === TransactionType.TRANSFER ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-pixel-ink/70">상대 자산</label>
          <select
            className={fieldClassName(Boolean(errors.relatedAssetId))}
            aria-invalid={Boolean(errors.relatedAssetId)}
            {...register('relatedAssetId', { required: true })}
          >
            <option value="">자산 선택</option>
            {assets
              .filter((asset) => asset.id !== assetIdValue)
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
          </select>
          {errors.relatedAssetId ? (
            <span className="text-xs text-pixel-red">상대 자산을 선택해주세요.</span>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-pixel-ink/70">카테고리</label>
          <button
            type="button"
            className={fieldClassName(Boolean(errors.categoryId))}
            onClick={onOpenCategoryPicker}
          >
            {categoryLabel ?? '카테고리 선택'}
          </button>
          <input type="hidden" {...register('categoryId')} />
          {errors.categoryId ? (
            <span className="text-xs text-pixel-red">카테고리를 선택해주세요.</span>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase text-pixel-ink/70">메모</label>
        <input
          type="text"
          className="rounded-2xl border-2 border-black px-4 py-2 text-sm"
          placeholder="필수로 입력하면 나중에 찾기 쉬워요."
          {...register('memo')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase text-pixel-ink/70">노트</label>
        <textarea
          className="min-h-[100px] rounded-2xl border-2 border-black px-4 py-2 text-sm"
          {...register('note')}
        />
      </div>
    </section>
  );
}
