import React, { useEffect, useMemo, useState } from 'react';
import { CategoryNode, TransactionType } from '@garangbi/types';
import { CategoryTree } from '../../types';
import { cn } from '../../../../lib/cn';

interface CategoryPickerModalProps {
  isOpen: boolean;
  tree: CategoryTree | null;
  transactionType: TransactionType;
  selectedId?: string | null;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
}

function getRootCategories(nodes: CategoryNode[]) {
  return nodes.filter((node) => !node.parentId);
}

export function CategoryPickerModal({
  isOpen,
  tree,
  transactionType,
  selectedId,
  onSelect,
  onClose,
}: CategoryPickerModalProps) {
  const categories = useMemo(() => {
    if (!tree) {
      return [];
    }
    if (transactionType === TransactionType.INCOME) {
      return tree.income;
    }
    if (transactionType === TransactionType.EXPENSE) {
      return tree.expense;
    }
    return [];
  }, [tree, transactionType]);

  const [activeParentId, setActiveParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId || !categories.length) {
      setActiveParentId(null);
      return;
    }
    const findParent = (nodes: CategoryNode[], parentId: string | null = null): string | null => {
      for (const node of nodes) {
        if (node.id === selectedId) {
          return parentId ?? node.id;
        }
        const childParent = findParent(node.children ?? [], node.id);
        if (childParent) {
          return childParent;
        }
      }
      return null;
    };
    setActiveParentId(findParent(categories));
  }, [selectedId, categories]);

  if (!isOpen) {
    return null;
  }

  const roots = getRootCategories(categories);
  const parentId = activeParentId ?? roots[0]?.id ?? null;
  const activeParent = categories.find((category) => category.id === parentId);
  const children = activeParent?.children ?? [];

  return (
    <div className="fixed inset-0 z-[2150] flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="pixel-heading text-lg">카테고리 선택</h3>
            <p className="text-xs text-pixel-ink/60">
              {transactionType === TransactionType.INCOME && '수입'}
              {transactionType === TransactionType.EXPENSE && '지출'}
              {' 유형 카테고리에서 선택해주세요.'}
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold uppercase text-pixel-ink"
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        {categories.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
              {roots.map((category) => {
                const active = (activeParent?.id ?? parentId) === category.id;
                return (
                  <button
                    type="button"
                    key={category.id}
                    className={cn(
                      'rounded-2xl border-2 border-black px-4 py-2 text-sm text-left shadow-pixel-sm transition',
                      active
                        ? 'bg-pixel-blue text-white'
                        : 'bg-white text-pixel-ink hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
                    )}
                    onClick={() => {
                      setActiveParentId(category.id);
                      if (!category.children?.length) {
                        onSelect(category.id);
                        onClose();
                      }
                    }}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>

            <div className="flex max-h-[360px] flex-col gap-2 overflow-auto pr-1">
              {children.length ? (
                children.map((child) => {
                  const active = selectedId === child.id;
                  return (
                    <button
                      type="button"
                      key={child.id}
                      className={cn(
                        'rounded-2xl border-2 border-black px-4 py-2 text-sm text-left shadow-pixel-sm transition',
                        active
                          ? 'bg-pixel-blue text-white'
                          : 'bg-white text-pixel-ink hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
                      )}
                      onClick={() => {
                        onSelect(child.id);
                        onClose();
                      }}
                    >
                      {child.name}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-black/40 px-4 py-6 text-sm text-pixel-ink/60">
                  세부 카테고리가 없습니다. 상위 카테고리를 선택하면 바로 적용됩니다.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-black/40 px-4 py-6 text-sm text-pixel-ink/60">
            선택 가능한 카테고리가 없습니다. 가계부 설정에서 먼저 카테고리를 만들어주세요.
          </div>
        )}
      </div>
    </div>
  );
}
