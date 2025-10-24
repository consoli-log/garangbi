import React, { useEffect, useRef, useState } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';
import { Tag } from '@garangbi/types';
import { TransactionFormValues } from '../../types';
import { cn } from '../../../../lib/cn';

interface TagInputProps {
  control: Control<TransactionFormValues>;
  name: 'tags';
  setValue: UseFormSetValue<TransactionFormValues>;
  tagOptions: Tag[];
}

export function TagInput({ control, name, setValue, tagOptions }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasManuallyClosed, setHasManuallyClosed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedTags = useWatch({ control, name }) ?? [];

  const trimmedValue = inputValue.trim();
  const shouldSuggest = trimmedValue.startsWith('#');
  const query = shouldSuggest ? trimmedValue.replace(/^#/, '').toLowerCase() : '';

  const suggestions = shouldSuggest
    ? tagOptions
        .filter((tag) => !selectedTags.includes(tag.name))
        .filter((tag) => (query ? tag.name.toLowerCase().includes(query) : true))
        .sort((a, b) => {
          if (b.usageCount !== a.usageCount) {
            return b.usageCount - a.usageCount;
          }
          return a.name.localeCompare(b.name);
        })
    : [];

  useEffect(() => {
    if (!shouldSuggest || !suggestions.length) {
      setIsDropdownOpen(false);
      return;
    }
    if (!hasManuallyClosed) {
      setIsDropdownOpen(true);
      setHighlightedIndex(0);
    }
  }, [shouldSuggest, suggestions.length, hasManuallyClosed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      setIsDropdownOpen(false);
      setHasManuallyClosed(true);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (highlightedIndex >= suggestions.length) {
      setHighlightedIndex(Math.max(0, suggestions.length - 1));
    }
  }, [highlightedIndex, suggestions.length]);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim().replace(/^#/, '');
    if (!trimmed || selectedTags.includes(trimmed)) {
      setInputValue('');
      setIsDropdownOpen(false);
      return;
    }
    const next = [...selectedTags, trimmed];
    setValue(name, next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setInputValue('');
    setIsDropdownOpen(false);
    setHasManuallyClosed(false);
  };

  const removeTag = (index: number) => {
    const next = selectedTags.filter((_, idx) => idx !== index);
    setValue(name, next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDropdownOpen && suggestions.length) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev - 1 < 0 ? suggestions.length - 1 : prev - 1,
        );
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        addTag(suggestions[highlightedIndex]?.name ?? '');
        return;
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (trimmedValue) {
        addTag(trimmedValue);
      }
      return;
    }

    if (event.key === 'Backspace' && !inputValue && selectedTags.length) {
      removeTag(selectedTags.length - 1);
    }
  };

  return (
    <div ref={containerRef} className="rounded-2xl border-2 border-black bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedTags.map((tag, index) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-pixel-purple/15 px-2 py-1 text-[10px] uppercase text-pixel-purple"
          >
            #{tag}
            <button
              type="button"
              className="text-[10px] text-pixel-purple/70"
              onClick={() => removeTag(index)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setHasManuallyClosed(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder="#태그 입력"
          className="min-w-[120px] flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>
      {isDropdownOpen ? (
        <div className="mt-2 max-h-40 overflow-auto rounded-2xl border border-black bg-white shadow-pixel-sm">
          {suggestions.length ? (
            suggestions.map((tag, index) => (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-xs',
                  highlightedIndex === index
                    ? 'bg-pixel-purple/20 text-pixel-purple'
                    : 'text-pixel-ink hover:bg-pixel-purple/10',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addTag(tag.name)}
              >
                <span>#{tag.name}</span>
                <span className="text-[10px] text-pixel-ink/50">사용 {tag.usageCount}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-pixel-ink/60">추천 태그가 없습니다.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
