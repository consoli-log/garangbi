import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Tag, CategoryNode } from '@garangbi/types';
import { cn } from '../../lib/cn';
import { TYPE_OPTIONS } from './constants';
import { AssetGroupOption, AssetOption, FilterState } from './types';

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  assetGroups: AssetGroupOption[];
  assets: AssetOption[];
  categories: CategoryNode[];
  tagOptions: Tag[];
}

export function FilterPanel({
  filters,
  onChange,
  assetGroups,
  assets,
  categories,
  tagOptions,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleValue = <T extends keyof FilterState>(key: T, value: FilterState[T]) => {
    const current = filters[key];
    if (Array.isArray(current) && Array.isArray(value)) {
      onChange({
        ...filters,
        [key]: value,
      });
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  const handleStartDateChange = (value?: string) => {
    if (filters.endDate && value && value > filters.endDate) {
      toast.warn('종료일보다 늦은 시작일은 선택할 수 없습니다.');
      return;
    }
    toggleValue('startDate', value);
  };

  const handleEndDateChange = (value?: string) => {
    if (filters.startDate && value && value < filters.startDate) {
      toast.warn('시작일 이후의 날짜를 선택해주세요.');
      return;
    }
    toggleValue('endDate', value);
  };

  const handleChipRemove = (type: keyof FilterState, id: string) => {
    const current = filters[type];
    if (!Array.isArray(current)) return;
    onChange({
      ...filters,
      [type]: current.filter((item) => item !== id),
    });
  };

  return (
    <div className="rounded-2xl border border-black bg-pixel-dark/10 p-4">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-semibold text-pixel-ink"
      >
        <span>필터</span>
        <span>{isOpen ? '숨기기' : '펼치기'}</span>
      </button>

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
                toggleValue('assetIds', [...filters.assetIds, value]);
              }}
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
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase text-pixel-ink/70">카테고리</label>
            <select
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value=""
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
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
            유형: {TYPE_OPTIONS.find((option) => option.value === type)?.label}
          </button>
        ))}
        {filters.assetIds.map((id) => {
          const asset = assets.find((item) => item.id === id);
          return (
            <button
              key={id}
              className="rounded-full border border-black bg-white px-3 py-1 text-xs uppercase"
              onClick={() => handleChipRemove('assetIds', id)}
            >
              자산: {asset ? `${asset.groupName} · ${asset.name}` : id}
            </button>
          );
        })}
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
      </div>
    </div>
  );
}
