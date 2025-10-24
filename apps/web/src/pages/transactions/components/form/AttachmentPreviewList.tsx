import React from 'react';
import { AttachmentPreview } from '../../types';
import { PREVIEW_FALLBACK_DATA_URI } from '../../constants';

interface AttachmentPreviewListProps {
  attachments: AttachmentPreview[];
  onRemove: (id: string) => void;
}

export function AttachmentPreviewList({ attachments, onRemove }: AttachmentPreviewListProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {attachments.map((attachment) => {
        const mimeType = attachment.mimeType.toLowerCase();
        const isHeic = mimeType.includes('heic') || mimeType.includes('heif');
        return (
          <div
            key={attachment.id}
            className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-black"
          >
            {isHeic ? (
              <div className="flex h-full w-full items-center justify-center bg-pixel-dark/10 px-2 text-center text-[10px] text-pixel-ink/60">
                HEIC 미리보기 미지원
              </div>
            ) : (
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = PREVIEW_FALLBACK_DATA_URI;
                }}
              />
            )}
            <button
              type="button"
              className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white"
              onClick={() => onRemove(attachment.id)}
            >
              X
            </button>
          </div>
        );
      })}
    </div>
  );
}
