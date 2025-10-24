import { TransactionType } from '@garangbi/types';

export const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: '수입', value: TransactionType.INCOME },
  { label: '지출', value: TransactionType.EXPENSE },
  { label: '이체', value: TransactionType.TRANSFER },
];

export const VIEW_OPTIONS = {
  LIST: 'LIST',
  CALENDAR: 'CALENDAR',
} as const;

export type ViewOption = (typeof VIEW_OPTIONS)[keyof typeof VIEW_OPTIONS];

export const MAX_ATTACHMENTS = 5;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/heix',
  'image/hevc',
]);

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

export const PREVIEW_FALLBACK_DATA_URI =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="#6b7280">미리보기 실패</text></svg>',
  );
