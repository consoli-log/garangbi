import React from 'react';
import { AttachmentPreview } from '../../types';
import { AttachmentPreviewList } from './AttachmentPreviewList';

interface AttachmentSectionProps {
  attachments: AttachmentPreview[];
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (id: string) => void;
  hasShownAttachmentNotice: boolean;
}

export function AttachmentSection({
  attachments,
  onFileSelect,
  onRemoveAttachment,
  hasShownAttachmentNotice,
}: AttachmentSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase text-pixel-ink/70">
        사진 첨부 (선택)
      </label>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
        multiple
        onChange={onFileSelect}
        className="text-xs"
      />
      <p className="text-xs text-pixel-ink/50">
        현재는 테스트 환경으로, 이미지는 서버에 업로드되지 않고 미리보기로만 확인할 수 있습니다.
      </p>
      {!hasShownAttachmentNotice ? (
        <p className="text-xs text-pixel-ink/40">
          처음 업로드 시 안내 메시지가 표시됩니다.
        </p>
      ) : null}
      <AttachmentPreviewList attachments={attachments} onRemove={onRemoveAttachment} />
    </section>
  );
}
