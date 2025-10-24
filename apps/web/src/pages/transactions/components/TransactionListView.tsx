import React from 'react';
import { Transaction, TransactionType } from '@garangbi/types';
import { calculateDailySummary, formatCurrency } from '../utils';
import { cn } from '../../../lib/cn';

interface TransactionListViewProps {
  groupedTransactions: Record<string, Transaction[]>;
  onSelect: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  deletingId: string | null;
}

export function TransactionListView({
  groupedTransactions,
  onSelect,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  isLoadingMore,
  deletingId,
}: TransactionListViewProps) {
  const groups = Object.entries(groupedTransactions).sort(
    (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
  );

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
                  className="group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
                >
                  <button
                    type="button"
                    className="flex flex-1 flex-col items-start text-left"
                    onClick={() => onSelect(transaction)}
                  >
                    <span className="text-sm font-semibold text-pixel-ink">
                      {transaction.memo || '제목 없음'}
                    </span>
                    <span className="text-xs text-pixel-ink/60">
                      {transaction.category?.name ?? '카테고리 없음'}
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
                  </button>
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
                  <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 group-hover:flex">
                    <button
                      type="button"
                      className="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-semibold uppercase shadow-pixel-sm"
                      onClick={() => onEdit(transaction)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-black bg-pixel-red px-3 py-1 text-[10px] font-semibold uppercase text-white shadow-pixel-sm disabled:opacity-60"
                      onClick={() => onDelete(transaction)}
                      disabled={deletingId === transaction.id}
                    >
                      {deletingId === transaction.id ? '삭제중' : '삭제'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {hasMore ? (
        <button
          type="button"
          className="self-center rounded-full border-2 border-black bg-white px-5 py-2 text-xs font-semibold uppercase shadow-pixel-sm disabled:opacity-60"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? '불러오는 중...' : '더 불러오기'}
        </button>
      ) : null}
    </div>
  );
}
