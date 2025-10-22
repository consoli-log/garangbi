import React, { useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType } from '@garangbi/types';
import { cn } from '../../lib/cn';
import { calculateDailySummary, formatCurrency } from './utils';

interface TransactionListProps {
  groupedTransactions: Record<string, Transaction[]>;
  onSelect: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
}

export function TransactionList({
  groupedTransactions,
  onSelect,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
}: TransactionListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(
    () =>
      Object.entries(groupedTransactions).sort(
        (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
      ),
    [groupedTransactions],
  );

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  if (!groups.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-pixel-ink/60">
        표시할 거래가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, items]) => {
        const summary = calculateDailySummary(items);
        return (
          <div key={date} className="rounded-2xl border border-black bg-pixel-dark/5 p-4">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-pixel-ink">{date}</div>
              <div className="flex items-center gap-3 text-xs uppercase text-pixel-ink/70">
                <span className="rounded-full bg-pixel-green/20 px-2 py-1 text-pixel-green">
                  +{formatCurrency(summary.income)}
                </span>
                <span className="rounded-full bg-pixel-red/20 px-2 py-1 text-pixel-red">
                  -{formatCurrency(summary.expense)}
                </span>
              </div>
            </header>
            <ul className="flex flex-col gap-3">
              {items.map((transaction) => (
                <li
                  key={transaction.id}
                  className="group relative flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
                  onClick={() => onSelect(transaction)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-pixel-ink">
                      {transaction.memo || '제목 없음'}
                    </span>
                    <span className="text-xs text-pixel-ink/60">
                      {transaction.categoryId ? '카테고리 연결됨' : '카테고리 없음'}
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {transaction.tags?.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-pixel-purple/15 px-2 py-1 text-[10px] uppercase text-pixel-purple"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn('text-base font-bold', {
                        'text-pixel-green': transaction.type === TransactionType.INCOME,
                        'text-pixel-red': transaction.type === TransactionType.EXPENSE,
                        'text-pixel-ink': transaction.type === TransactionType.TRANSFER,
                      })}
                    >
                      {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-pixel-ink/60">
                      {new Date(transaction.transactionDate).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="absolute right-3 top-3 hidden gap-2 group-hover:flex">
                    <button
                      type="button"
                      className="rounded-full border border-black bg-white px-2 py-1 text-[10px] font-semibold uppercase shadow-pixel-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(transaction);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-black bg-pixel-red px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-pixel-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(transaction);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div ref={loadMoreRef} className="h-1 w-full" />
      {isLoadingMore ? (
        <div className="flex items-center justify-center gap-2 text-xs text-pixel-ink/60">
          더 불러오는 중입니다...
        </div>
      ) : null}
      {!hasMore && !isLoading ? (
        <div className="text-center text-xs text-pixel-ink/50">마지막 거래입니다.</div>
      ) : null}
    </div>
  );
}
