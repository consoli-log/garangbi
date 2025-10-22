import { CategoryNode, Tag, TransactionType } from '@garangbi/types';

export interface SplitFormValue {
  categoryId: string;
  amount: number | '';
  memo?: string;
}

export interface AttachmentPreview {
  id: string;
  file?: File;
  previewUrl: string;
  mimeType: string;
  size: number;
  name: string;
  isExisting?: boolean;
  remoteUrl?: string;
}

export interface TransactionFormValues {
  type: TransactionType;
  transactionDate: string;
  amount: number | '';
  assetId: string;
  relatedAssetId?: string | null;
  categoryId?: string | null;
  memo?: string;
  note?: string;
  tags: string[];
  splits: SplitFormValue[];
  attachments: AttachmentPreview[];
}

export interface FilterState {
  startDate?: string;
  endDate?: string;
  types: TransactionType[];
  assetIds: string[];
  categoryIds: string[];
  tagIds: string[];
}

export interface AssetOption {
  id: string;
  name: string;
  groupName: string;
}

export interface AssetGroupOption {
  id: string;
  name: string;
  assets: AssetOption[];
}
