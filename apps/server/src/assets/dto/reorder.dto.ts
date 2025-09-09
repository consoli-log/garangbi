export class ReorderDto {
  items!: { id: string; order: number }[];
  ledgerId!: string;
}
