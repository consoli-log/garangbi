import React, { useMemo, useState } from 'react';
import { Tag, CategoryNode } from '@garangbi/types';
import { FilterState, AssetOption } from '../types';
import { TYPE_OPTIONS } from '../constants';
import { cn } from '../../../lib/cn';
import { groupAssetsByGroupName } from '../utils';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  assets: AssetOption[];
  categories: CategoryNode[];
  tagOptions: Tag[];
}

export function FilterPanel({
  filters,
  onChange,
  assets,
  categories,
  tagOptions,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const groupedAssets = useMemo(() => groupAssetsByGroupName(assets), [assets]);

  const handlePartialUpdate = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const handleStartDateChange = (value?: string) => {
    if (!value) {
      handlePartialUpdate({ startDate: undefined });
      return;
    }
    const next: FilterState = { ...filters, startDate: value };
    if (next.endDate && value > next.endDate) {
      next.endDate = undefined;
    }
    onChange(next);
  };

  const handleEndDateChange = (value?: string) => {
    if (!value) {
      handlePartialUpdate({ endDate: undefined });
      return;
    }
    const next: FilterState = { ...filters, endDate: value };
    if (next.startDate && value < next.startDate) {
      next.startDate = undefined;
    }
    onChange(next);
  };

  const toggleValue = <K extends keyof FilterState>(key: K, values: FilterState[K]) => {
    onChange({ ...filters, [key]: values });
  };

  const handleChipRemove = <K extends keyof FilterState>(key: K, value: string) => {
    if (Array.isArray(filters[key])) {
      toggleValue(
        key,
        (filters[key] as string[]).filter((item) => item !== value) as FilterState[K],
      );
    }
  };

  const handleReset = () => {
    onChange({
      startDate: undefined,
      endDate: undefined,
      types: [],
      assetIds: [],
      categoryIds: [],
      tagIds: [],
    });
  };

  return (
    <div className="rounded-2xl border border-black bg-pixel-dark/10 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-pixel-ink"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span>필터</span>
          <span className="text-xs text-pixel-ink/60">{isOpen ? '숨기기' : '펼치기'}</span>
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-pixel-blue"
          onClick={handleReset}
        >
          초기화
        </button>
      </div>

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
                if (filters.assetIds.includes(value)) return;
                toggleValue('assetIds', [...filters.assetIds, value]);
              }}
            >
              <option value="">자산 선택</option>
              {groupedAssets.map((group) => (
                <optgroup key={group.groupName} label={group.groupName}>
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
                if (filters.categoryIds.includes(value)) return;
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
                if (filters.tagIds.includes(value)) return;
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
            유형: {TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type}
          </button>
        ))}
        {filters.assetIds.map((id) => (
          <button
            key={id}
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handleChipRemove('assetIds', id)}
          >
            자산: {assets.find((asset) => asset.id === id)?.name ?? id}
          </button>
        ))}
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
        {filters.startDate ? (
          <button
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handlePartialUpdate({ startDate: undefined })}
          >
            시작일: {filters.startDate}
          </button>
        ) : null}
        {filters.endDate ? (
          <button
            className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
            onClick={() => handlePartialUpdate({ endDate: undefined })}
          >
            종료일: {filters.endDate}
          </button>
        ) : null}
      </div>
    </div>
  );
}
