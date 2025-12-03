import { registerAs } from '@nestjs/config';

const DEFAULT_ACCESS_TOKEN_TTL_MINUTES = 60;
const DEFAULT_REMEMBER_ME_TTL_MINUTES = 60 * 24 * 14; // 14일

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET ?? 'changeme',
  accessTokenTtlMinutes: parseInt(
    process.env.JWT_ACCESS_TOKEN_TTL_MINUTES ?? String(DEFAULT_ACCESS_TOKEN_TTL_MINUTES),
    10,
  ),
  rememberMeAccessTokenTtlMinutes: parseInt(
    process.env.JWT_REMEMBER_ME_TOKEN_TTL_MINUTES ?? String(DEFAULT_REMEMBER_ME_TTL_MINUTES),
    10,
  ),
}));
