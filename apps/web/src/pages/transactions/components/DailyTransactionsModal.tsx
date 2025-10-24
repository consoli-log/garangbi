import React from 'react';
import { Transaction, TransactionType } from '@garangbi/types';
import { formatCurrency } from '../utils';
import { cn } from '../../../lib/cn';

interface DailyTransactionsModalProps {
  date: string;
  items: Transaction[];
  onClose: () => void;
  onSelect: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  deletingId: string | null;
}

export function DailyTransactionsModal({
  date,
  items,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
}: DailyTransactionsModalProps) {
  const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[2050] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <header className="flex items-center justify-between">
          <div>
            <h3 className="pixel-heading text-xl">일일 거래</h3>
            <p className="text-sm text-pixel-ink/70">{formattedDate}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold uppercase shadow-pixel-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        {items.length ? (
          <ul className="flex max-h-[420px] flex-col gap-3 overflow-auto pr-1">
            {items.map((transaction) => (
              <li
                key={transaction.id}
                className="group relative flex items-center justify-between gap-3 rounded-2xl border border-black bg-pixel-dark/5 px-4 py-3"
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
                <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 gap-2 group-hover:flex">
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
        ) : (
          <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-black/40">
            <p className="text-sm text-pixel-ink/60">선택한 날짜에는 거래가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
