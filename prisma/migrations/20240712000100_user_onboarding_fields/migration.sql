-- Add onboarding metadata to user accounts
ALTER TABLE "User"
  ADD COLUMN "termsAgreedAt" TIMESTAMP(3),
  ADD COLUMN "privacyAgreedAt" TIMESTAMP(3),
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT TRUE;
