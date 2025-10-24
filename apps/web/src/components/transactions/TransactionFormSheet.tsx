import React, { useEffect, useMemo, useState } from 'react';
import {
  Control,
  Controller,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form';
import { CategoryNode, Tag, TransactionType } from '@garangbi/types';
import { cn } from '../../lib/cn';
import {
  AssetGroupOption,
  AttachmentPreview,
  SplitFormValue,
  TransactionFormValues,
} from './types';
import { formatCurrency } from './utils';

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

export function TransactionFormSheet({
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
  const effectiveAmount = typeof amountValue === 'number' ? amountValue : 0;
  const remainder = useMemo(() => effectiveAmount - splitTotal, [effectiveAmount, splitTotal]);

  if (!isOpen) return null;

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
            {[TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER].map(
              (type) => {
                const label =
                  type === TransactionType.INCOME
                    ? '수입'
                    : type === TransactionType.EXPENSE
                      ? '지출'
                      : '이체';
                return (
                  <label
                    key={type}
                    className={cn(
                      'cursor-pointer rounded-full border-2 border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide shadow-pixel-sm transition',
                      typeValue === type ? 'bg-pixel-blue text-white' : 'bg-white text-pixel-ink',
                    )}
                  >
                    <input hidden type="radio" value={type} {...register('type')} />
                    {label}
                  </label>
                );
              },
            )}
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
                        ? category.type === TransactionType.INCOME
                        : category.type === TransactionType.EXPENSE,
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
              <TagInput control={control} setValue={setValue} availableTags={availableTags} />
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
                        .filter((category) => category.type === TransactionType.EXPENSE)
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
                  <span className={cn(remainder === 0 ? 'text-pixel-green' : 'text-pixel-red')}>
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
  setValue: UseFormSetValue<TransactionFormValues>;
  availableTags: Tag[];
}

function TagInput({ control, setValue, availableTags }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setHighlightIndex(0);
  }, [inputValue]);

  return (
    <Controller
      control={control}
      name="tags"
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
              if (isDuplicate || seenNames.has(normalizedTagName)) {
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
          setValue('tags', next, { shouldDirty: true });
          field.onChange(next);
          setInputValue('');
        };

        const removeTag = (index: number) => {
          const next = currentTags.filter((_, idx) => idx !== index);
          setValue('tags', next, { shouldDirty: true });
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
