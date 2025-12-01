import { registerAs } from '@nestjs/config';

const DEFAULT_EMAIL_VERIFICATION_URL = 'http://localhost:5173/verify-email';
const DEFAULT_TOKEN_TTL_MINUTES = 60;

export default registerAs('auth', () => ({
  emailVerification: {
    baseUrl: process.env.EMAIL_VERIFICATION_BASE_URL ?? DEFAULT_EMAIL_VERIFICATION_URL,
    tokenTtlMinutes: parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? String(DEFAULT_TOKEN_TTL_MINUTES),
      10,
    ),
  },
}));

