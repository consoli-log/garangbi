export class CreateAssetDto {
  ledgerId!: string;
  groupId?: string | null;
  name!: string;
  kind!: string; // CASH | BANK | CARD | LOAN | INVEST
  initialBalance?: number;
  includeInNetWorth?: boolean;
  cardBillingDay?: number | null;
  nextBillingAmount?: number | null;
}
