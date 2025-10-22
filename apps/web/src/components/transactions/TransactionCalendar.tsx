import React, { useMemo, useState } from 'react';
import { Transaction } from '@garangbi/types';
import { cn } from '../../lib/cn';
import { calculateDailySummary, formatCurrency } from './utils';

interface TransactionCalendarProps {
  transactions: Transaction[];
  onSelectDate: (iso: string) => void;
}

export function TransactionCalendar({ transactions, onSelectDate }: TransactionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarCells = useMemo(() => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = startOfMonth.getDay();
    const daysInPrevMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0,
    ).getDate();

    const cells: {
      date: Date;
      iso: string;
      label: number;
      income: number;
      expense: number;
    }[] = [];

    for (let i = startDay - 1; i >= 0; i -= 1) {
      const date = new Date(startOfMonth);
      date.setDate(-i);
      const iso = date.toISOString().slice(0, 10);
      const summary = calculateDailySummary(
        transactions.filter((transaction) => transaction.transactionDate.slice(0, 10) === iso),
      );
      cells.push({
        date,
        iso,
        label: date.getDate(),
        income: summary.income,
        expense: summary.expense,
      });
    }

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const iso = date.toISOString().slice(0, 10);
      const summary = calculateDailySummary(
        transactions.filter((transaction) => transaction.transactionDate.slice(0, 10) === iso),
      );
      cells.push({ date, iso, label: day, income: summary.income, expense: summary.expense });
    }

    const totalCells = 42;
    const remaining = totalCells - cells.length;
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    for (let i = 1; i <= remaining; i += 1) {
      const date = new Date(endOfMonth);
      date.setDate(date.getDate() + i);
      const iso = date.toISOString().slice(0, 10);
      const summary = calculateDailySummary(
        transactions.filter((transaction) => transaction.transactionDate.slice(0, 10) === iso),
      );
      cells.push({
        date,
        iso,
        label: date.getDate(),
        income: summary.income,
        expense: summary.expense,
      });
    }

    return cells;
  }, [currentDate, transactions]);

  const monthLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

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
