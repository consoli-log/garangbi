import { createHmac } from 'crypto';

type JwtHeader = {
  alg: 'HS256';
  typ: 'JWT';
};

type BasePayload = {
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(data: string | Buffer): string {
  if (typeof data === 'string') {
    return Buffer.from(data).toString('base64url');
  }
  return Buffer.from(data).toString('base64url');
}

export interface SignJwtOptions<TPayload extends object> {
  secret: string;
  expiresInSeconds: number;
  payload: TPayload;
}

export function signJwt<TPayload extends object>({
  secret,
  expiresInSeconds,
  payload,
}: SignJwtOptions<TPayload>): string {
  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const issuedAt = Math.floor(Date.now() / 1000);
  const fullPayload: BasePayload & TPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  };

  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${headerSegment}.${payloadSegment}`;
  const signature = createHmac('sha256', encoder.encode(secret))
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}
