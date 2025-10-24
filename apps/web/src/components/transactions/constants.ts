import { TransactionType } from '@garangbi/types';

export const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: '수입', value: TransactionType.INCOME },
  { label: '지출', value: TransactionType.EXPENSE },
  { label: '이체', value: TransactionType.TRANSFER },
];
