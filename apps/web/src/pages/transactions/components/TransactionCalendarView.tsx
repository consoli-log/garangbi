import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType } from '@garangbi/types';
import { formatCurrency, getLocalDateKey } from '../utils';
import { cn } from '../../../lib/cn';

interface TransactionCalendarViewProps {
  transactions: Transaction[];
  onSelectDate: (isoDate: string) => void;
}

export function TransactionCalendarView({
  transactions,
  onSelectDate,
}: TransactionCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
      }),
    [currentDate],
  );

  const dailyTotals = useMemo(() => {
    return transactions.reduce<Record<string, { income: number; expense: number }>>(
      (acc, transaction) => {
        const dateKey = getLocalDateKey(transaction.transactionDate);
        if (!dateKey) {
          return acc;
        }
        if (!acc[dateKey]) {
          acc[dateKey] = { income: 0, expense: 0 };
        }
        if (transaction.type === TransactionType.INCOME) {
          acc[dateKey].income += transaction.amount;
        }
        if (transaction.type === TransactionType.EXPENSE) {
          acc[dateKey].expense += transaction.amount;
        }
        return acc;
      },
      {},
    );
  }, [transactions]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - startDay);

    const cells = Array.from({ length: 42 }).map((_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const iso = getLocalDateKey(date);
      return {
        date,
        iso,
        label: date.getDate(),
        income: dailyTotals[iso]?.income ?? 0,
        expense: dailyTotals[iso]?.expense ?? 0,
      };
    });

    return cells;
  }, [currentDate, dailyTotals]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold"
          onClick={() =>
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
          }
        >
          이전
        </button>
        <div className="text-sm font-semibold uppercase text-pixel-ink">{monthLabel}</div>
        <button
          type="button"
          className="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold"
          onClick={() =>
            setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
          }
        >
          다음
        </button>
      </header>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-pixel-ink/70">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="rounded-full bg-pixel-dark/10 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell) => {
          const isCurrentMonth = cell.date.getMonth() === currentDate.getMonth();
          return (
            <button
              type="button"
              key={cell.iso}
              className={cn(
                'flex flex-col gap-1 rounded-2xl border border-black bg-white px-2 py-2 text-left shadow-pixel-sm transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
                !isCurrentMonth && 'opacity-50',
              )}
              onClick={() => onSelectDate(cell.iso)}
            >
              <span className="text-xs font-semibold text-pixel-ink">{cell.label}</span>
              {cell.income ? (
                <span className="text-[10px] text-pixel-green">
                  +{formatCurrency(cell.income)}
                </span>
              ) : null}
              {cell.expense ? (
                <span className="text-[10px] text-pixel-red">
                  -{formatCurrency(cell.expense)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
