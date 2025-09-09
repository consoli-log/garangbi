export class CreateGroupDto {
  ledgerId!: string;
  name!: string;
  type?: 'ASSET' | 'DEBT';
}
