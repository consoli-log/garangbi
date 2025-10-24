import { Transaction, TransactionType, Tag, CategoryNode } from '@garangbi/types';
import {
  AttachmentPreview,
  AssetOption,
  GroupedAssetOption,
  TransactionFormValues,
} from './types';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
} from './constants';

export function formatCurrency(amount: number | '') {
  if (amount === '' || Number.isNaN(amount)) {
    return '0';
  }
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function getTodayDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toLocalDateTimeInputValue(value: string | undefined | null) {
  if (!value) {
    return getTodayDateTime();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return getTodayDateTime();
  }
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function groupAssetsByGroupName(assets: AssetOption[]): GroupedAssetOption[] {
  const grouped = assets.reduce<Record<string, AssetOption[]>>((acc, asset) => {
    if (!acc[asset.groupName]) {
      acc[asset.groupName] = [];
    }
    acc[asset.groupName].push(asset);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([groupName, groupAssets]) => ({
      groupName,
      assets: groupAssets.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName));
}

export function isSupportedImage(file: File) {
  const mimeType = file.type.toLowerCase();
  if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return true;
  }
  const lastDotIndex = file.name.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  const extension = file.name.slice(lastDotIndex).toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

export function getLocalDateKey(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createDefaultFormValues(): TransactionFormValues {
  return {
    type: TransactionType.EXPENSE,
    transactionDate: getTodayDateTime(),
    amount: '',
    assetId: '',
    relatedAssetId: null,
    categoryId: undefined,
    memo: '',
    note: '',
    tags: [],
    splits: [],
    attachments: [],
  };
}

export function extractUniqueTags(transactions: Transaction[]): Tag[] {
  const unique = transactions.reduce<Record<string, Tag>>((acc, transaction) => {
    transaction.tags?.forEach((tag) => {
      acc[tag.id] = tag;
    });
    return acc;
  }, {});
  return Object.values(unique).sort((a, b) => a.name.localeCompare(b.name));
}

export function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const key = getLocalDateKey(transaction.transactionDate);
    if (!key) {
      return acc;
    }
    acc[key] = acc[key] ? [...acc[key], transaction] : [transaction];
    return acc;
  }, {});
}

export function calculateDailySummary(transactions: Transaction[]) {
  return transactions.reduce<{ income: number; expense: number }>(
    (acc, transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        acc.income += transaction.amount;
      }
      if (transaction.type === TransactionType.EXPENSE) {
        acc.expense += transaction.amount;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

export function flattenCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCategoryTree(node.children));
    }
  });
  return result;
}

export function revokeAttachmentPreviews(attachments: AttachmentPreview[]) {
  attachments.forEach((attachment) => {
    if (attachment.file) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
  });
}
