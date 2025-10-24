import React from 'react';
import {
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
} from 'react-hook-form';
import { TransactionFormValues } from '../../types';
import { formatCurrency } from '../../utils';
import { cn } from '../../../../lib/cn';

interface SplitEditorProps {
  isActive: boolean;
  splitsArray: UseFieldArrayReturn<TransactionFormValues, 'splits'>;
  register: UseFormRegister<TransactionFormValues>;
  errors: FieldErrors<TransactionFormValues>;
  onFillSplitAmount: (index: number) => void;
  onRequestCategoryPick: (index: number) => void;
  categoryLabelMap: Record<string, string>;
  splitTotal: number;
  remainder: number;
  amountMismatch: boolean;
  values: TransactionFormValues['splits'];
}

export function SplitEditor({
  isActive,
  splitsArray,
  register,
  errors,
  onFillSplitAmount,
  onRequestCategoryPick,
  categoryLabelMap,
  splitTotal,
  remainder,
  amountMismatch,
  values,
}: SplitEditorProps) {
  if (!isActive) {
    return (
      <p className="rounded-2xl bg-pixel-dark/10 px-3 py-2 text-xs text-pixel-ink/60">
        분할을 사용하지 않으면 전체 금액이 선택한 카테고리에 한 번에 기록됩니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-1">
        {splitsArray.fields.map((field, index) => {
          const categoryId = values?.[index]?.categoryId ?? field.categoryId;
          const label = categoryId ? categoryLabelMap[categoryId] ?? '알 수 없는 카테고리' : '카테고리 선택';
          const categoryError = errors.splits?.[index]?.categoryId;
          const amountError = errors.splits?.[index]?.amount;
          return (
            <div
              key={field.id}
              className="grid gap-2 rounded-2xl border-2 border-black bg-white p-3 shadow-pixel-sm lg:grid-cols-[minmax(0,220px)_minmax(0,180px)_minmax(0,1fr)_auto]"
            >
              <button
                type="button"
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left text-sm transition',
                  categoryError
                    ? 'border-pixel-red bg-pixel-red/10 text-pixel-red'
                    : 'border-black bg-pixel-dark/5 text-pixel-ink hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-sm',
                )}
                onClick={() => onRequestCategoryPick(index)}
              >
                {label}
              </button>
              <div className="flex flex-col gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  className={cn(
                    'rounded-xl border-2 px-3 py-2 text-sm',
                    amountError ? 'border-pixel-red' : 'border-black',
                  )}
                  {...register(`splits.${index}.amount` as const, { valueAsNumber: true })}
                />
                <button
                  type="button"
                  className="self-start rounded-full border border-black bg-white px-2 py-1 text-[10px] uppercase text-pixel-ink"
                  onClick={() => onFillSplitAmount(index)}
                >
                  잔액 채우기
                </button>
              </div>
              <input
                type="text"
                placeholder="메모 (선택)"
                className="rounded-xl border-2 border-black px-3 py-2 text-sm"
                {...register(`splits.${index}.memo` as const)}
              />
              <button
                type="button"
                className="self-start rounded-full border border-black bg-white px-2 py-1 text-[10px] uppercase text-pixel-red"
                onClick={() => splitsArray.remove(index)}
              >
                삭제
              </button>
            </div>
          );
        })}
      </div>
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
          잔액: {remainder >= 0 ? '' : '-'}
          {formatCurrency(Math.abs(remainder))}원
        </span>
      </div>
      {amountMismatch ? (
        <div className="rounded-2xl bg-pixel-red/10 px-3 py-2 text-xs text-pixel-red">
          분할 금액의 합계가 총 금액과 일치해야 저장할 수 있습니다.
        </div>
      ) : null}
    </div>
  );
}
