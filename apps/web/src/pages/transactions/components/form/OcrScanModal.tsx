import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency, getTodayDateTime } from '../../utils';

interface OcrResult {
  amount?: number;
  transactionDate?: string;
  memo?: string;
}

interface OcrScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: OcrResult) => void;
}

export function OcrScanModal({ isOpen, onClose, onConfirm }: OcrScanModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [transactionDate, setTransactionDate] = useState<string>(getTodayDateTime());
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!isOpen) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      setFileName(null);
      setAmount('');
      setTransactionDate(getTodayDateTime());
      setMemo('');
    }
  }, [isOpen, previewUrl]);

  const formattedAmount = useMemo(
    () => (typeof amount === 'number' ? formatCurrency(amount) : '0'),
    [amount],
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="flex w-full max-w-lg flex-col gap-4 rounded-[32px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <header className="flex items-center justify-between">
          <h3 className="pixel-heading text-lg">스캔하여 입력</h3>
          <button
            type="button"
            className="text-xs font-semibold uppercase text-pixel-ink"
            onClick={onClose}
          >
            닫기
          </button>
        </header>

        <p className="text-sm text-pixel-ink/70">
          영수증을 촬영하거나 업로드하면 기본 정보를 추출할 수 있어요. 현재는 베타 단계로, 필요하다면 추출
          결과를 직접 수정해주세요.
        </p>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black px-4 py-6 text-sm text-pixel-ink/70 hover:border-solid">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-40 w-full rounded-xl object-cover" />
          ) : (
            <>
              <span>영수증 촬영 / 업로드</span>
              <span className="text-xs text-pixel-ink/50">jpg, png, heic</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
              }
              setPreviewUrl(URL.createObjectURL(file));
              setFileName(file.name);
              setMemo((prev) => prev || file.name.replace(/\.[^/.]+$/, ''));
            }}
          />
        </label>

        {fileName ? (
          <div className="rounded-2xl bg-pixel-dark/10 px-3 py-2 text-xs text-pixel-ink/60">
            파일: {fileName}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase text-pixel-ink/70">금액</span>
            <input
              type="number"
              inputMode="decimal"
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value={amount}
              onChange={(event) => {
                const value = event.target.value;
                setAmount(value === '' ? '' : Number(value));
              }}
            />
            <span className="text-xs text-pixel-ink/50">{formattedAmount} 원</span>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase text-pixel-ink/70">거래 시각</span>
            <input
              type="datetime-local"
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase text-pixel-ink/70">메모</span>
            <input
              type="text"
              className="rounded-2xl border-2 border-black px-3 py-2 text-sm"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="상호명 또는 메모"
            />
          </label>
        </div>

        <footer className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold uppercase shadow-pixel-sm"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="pixel-button bg-pixel-blue text-white hover:text-white"
            onClick={() => {
              onConfirm({
                amount: typeof amount === 'number' ? amount : undefined,
                transactionDate,
                memo: memo || undefined,
              });
              onClose();
            }}
            disabled={!previewUrl}
          >
            추출값 적용
          </button>
        </footer>
      </div>
    </div>
  );
}
