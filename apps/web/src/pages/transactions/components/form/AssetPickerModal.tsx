import React from 'react';
import { GroupedAssetOption } from '../../types';
import { cn } from '../../../../lib/cn';

interface AssetPickerModalProps {
  isOpen: boolean;
  assets: GroupedAssetOption[];
  selectedId?: string;
  onSelect: (assetId: string) => void;
  onClose: () => void;
}

export function AssetPickerModal({
  isOpen,
  assets,
  selectedId,
  onSelect,
  onClose,
}: AssetPickerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-[28px] border-4 border-black bg-white p-6 shadow-pixel-lg">
        <header className="flex items-center justify-between">
          <h3 className="pixel-heading text-lg">자산 선택</h3>
          <button
            type="button"
            className="text-xs font-semibold uppercase text-pixel-ink"
            onClick={onClose}
          >
            닫기
          </button>
        </header>
        <div className="flex max-h-[360px] flex-col gap-4 overflow-auto pr-1">
          {assets.map((group) => (
            <div key={group.groupName}>
              <div className="text-xs font-semibold uppercase text-pixel-ink/70">
                {group.groupName}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {group.assets.map((asset) => {
                  const active = selectedId === asset.id;
                  return (
                    <button
                      type="button"
                      key={asset.id}
                      className={cn(
                        'rounded-2xl border-2 border-black px-4 py-2 text-sm text-left shadow-pixel-sm transition',
                        active
                          ? 'bg-pixel-blue text-white'
                          : 'bg-white text-pixel-ink hover:-translate-x-1 hover:-translate-y-1 hover:shadow-pixel-md',
                      )}
                      onClick={() => {
                        onSelect(asset.id);
                        onClose();
                      }}
                    >
                      {asset.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
