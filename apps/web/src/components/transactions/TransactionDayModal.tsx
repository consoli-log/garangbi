import React from 'react';
import { Transaction, TransactionType } from '@garangbi/types';
import { cn } from '../../lib/cn';
import { calculateDailySummary, formatCurrency } from './utils';

interface TransactionDayModalProps {
  date: string;
  transactions: Transaction[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionDayModal({
  date,
  transactions,
  onClose,
  onSelect,
  onEdit,
  onDelete,
}: TransactionDayModalProps) {
  const [year, month, day] = date.split('-').map(Number);
  const displayDate = year && month && day ? new Date(year, month - 1, day) : new Date();
  const summary = calculateDailySummary(transactions);

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <button
          type="button"
          className="absolute right-4 top-4 text-sm font-semibold uppercase text-pixel-ink"
          onClick={onClose}
        >
          닫기
        </button>
        <header className="flex flex-col gap-2">
          <h3 className="pixel-heading text-xl">
            {displayDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </h3>
          <div className="flex items-center gap-3 text-xs uppercase text-pixel-ink/70">
            <span className="rounded-full bg-pixel-green/20 px-2 py-1 text-pixel-green">
              +{formatCurrency(summary.income)}
            </span>
            <span className="rounded-full bg-pixel-red/20 px-2 py-1 text-pixel-red">
              -{formatCurrency(summary.expense)}
            </span>
          </div>
        </header>

        <section className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
          {transactions.length ? (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black bg-white px-4 py-3 shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    className="text-left text-sm font-semibold text-pixel-ink"
                    onClick={() => onSelect(transaction)}
                  >
                    {transaction.memo || '제목 없음'}
                  </button>
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
                    onClick={() => onEdit(transaction)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-black bg-pixel-red px-2 py-1 text-[10px] font-semibold uppercase text-white shadow-pixel-sm"
                    onClick={() => onDelete(transaction)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-black/30 bg-pixel-dark/5 text-sm text-pixel-ink/60">
              선택한 날짜에 등록된 거래가 없습니다.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
