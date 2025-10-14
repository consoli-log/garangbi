export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  mainLedgerId?: string | null;
}
