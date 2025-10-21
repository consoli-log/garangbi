export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  mainLedgerId?: string | null;
  provider: string;
  hasPassword: boolean;
  onboardingCompleted: boolean;
  termsAgreedAt?: string | null;
  privacyAgreedAt?: string | null;
}
