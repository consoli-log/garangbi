import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { TransactionType } from '@garangbi/types';
import { TYPE_OPTIONS } from '../../constants';
import { TransactionFormValues } from '../../types';
import { cn } from '../../../../lib/cn';

interface FormTypeSelectorProps {
  typeValue: TransactionType;
  register: UseFormRegister<TransactionFormValues>;
  onOpenOcr: () => void;
}

export function FormTypeSelector({
  typeValue,
  register,
  onOpenOcr,
}: FormTypeSelectorProps) {
  return (
    <section className="flex flex-wrap gap-2">
      {TYPE_OPTIONS.map((option) => (
        <label
          key={option.value}
          className={cn(
            'cursor-pointer rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
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
      <button
        type="button"
        className="ml-auto rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold uppercase text-pixel-blue shadow-pixel-sm"
        onClick={onOpenOcr}
      >
        스캔하여 입력
      </button>
    </section>
  );
}
