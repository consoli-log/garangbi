import { registerAs } from '@nestjs/config';

export type MailProvider = 'log' | 'sendgrid';

const DEFAULT_FROM_EMAIL = 'no-reply@zzogaebook.local';
const DEFAULT_FROM_NAME = '쪼개부기';

export default registerAs('mail', () => ({
  provider: (process.env.MAIL_PROVIDER ?? 'log') as MailProvider,
  fromEmail: process.env.MAIL_FROM_EMAIL ?? DEFAULT_FROM_EMAIL,
  fromName: process.env.MAIL_FROM_NAME ?? DEFAULT_FROM_NAME,
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
}));
