import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'test', 'prod').default('dev'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  MAIL_PROVIDER: Joi.string().valid('log', 'sendgrid').default('log'),
  MAIL_FROM_EMAIL: Joi.string().email().default('no-reply@zzogaebook.local'),
  MAIL_FROM_NAME: Joi.string().default('쪼개부기'),
  SENDGRID_API_KEY: Joi.when('MAIL_PROVIDER', {
    is: 'sendgrid',
    then: Joi.string().min(10).required(),
    otherwise: Joi.string().optional(),
  }),
  EMAIL_VERIFICATION_BASE_URL: Joi.string()
    .uri()
    .default('http://localhost:5173/verify-email'),
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: Joi.number().integer().min(5).default(60),
});
