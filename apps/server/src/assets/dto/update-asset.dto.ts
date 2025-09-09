export class UpdateAssetDto {
  groupId?: string | null;
  name?: string;
  kind?: string;
  includeInNetWorth?: boolean;
  cardBillingDay?: number | null;
  nextBillingAmount?: number | null;
}
