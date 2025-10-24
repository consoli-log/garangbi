import React from 'react';
import {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
} from 'react-hook-form';
import { TransactionFormValues } from '../../types';
import { SplitEditor } from './SplitEditor';
import { cn } from '../../../../lib/cn';

type CategoryContextSetter = (context: { target: 'primary' } | { target: 'split'; index: number }) => void;

interface SplitSectionProps {
  isSplitMode: boolean;
  onToggleSplitMode: (value: boolean) => void;
  splitsArray: UseFieldArrayReturn<TransactionFormValues, 'splits'>;
  register: UseFormRegister<TransactionFormValues>;
  errors: FieldErrors<TransactionFormValues>;
  onFillSplitAmount: (index: number) => void;
  setCategoryContext: CategoryContextSetter;
  categoryLabelMap: Record<string, string>;
  splitTotal: number;
  remainder: number;
  amountMismatch: boolean;
  values: TransactionFormValues['splits'];
}

export function SplitSection({
  isSplitMode,
  onToggleSplitMode,
  splitsArray,
  register,
  errors,
  onFillSplitAmount,
  setCategoryContext,
  categoryLabelMap,
  splitTotal,
  remainder,
  amountMismatch,
  values,
}: SplitSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase text-pixel-ink/70">
          거래 쪼개기
        </label>
        <button
          type="button"
          className={cn(
            'rounded-full border-2 border-black px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm transition',
            isSplitMode ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
          )}
          onClick={() => onToggleSplitMode(!isSplitMode)}
        >
          {isSplitMode ? '분할 취소' : '분할 추가'}
        </button>
      </div>
      <SplitEditor
        isActive={isSplitMode}
        splitsArray={splitsArray}
        register={register}
        errors={errors}
        onFillSplitAmount={onFillSplitAmount}
        onRequestCategoryPick={(index) => setCategoryContext({ target: 'split', index })}
        categoryLabelMap={categoryLabelMap}
        splitTotal={splitTotal}
        remainder={remainder}
        amountMismatch={amountMismatch}
        values={values}
      />
    </section>
  );
}
