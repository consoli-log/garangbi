import React from 'react';

interface FormFooterProps {
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
  disabled: boolean;
}

export function FormFooter({ onCancel, isSaving, submitLabel, disabled }: FormFooterProps) {
  return (
    <footer className="mt-4 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-semibold uppercase shadow-pixel-sm"
      >
        취소
      </button>
      <button
        type="submit"
        className="pixel-button bg-pixel-blue text-white hover:text-white disabled:opacity-60"
        disabled={disabled}
      >
        {isSaving ? '저장 중...' : submitLabel}
      </button>
    </footer>
  );
}
