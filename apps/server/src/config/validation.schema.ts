import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'test', 'prod').default('dev'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  EMAIL_VERIFICATION_BASE_URL: Joi.string()
    .uri()
    .default('http://localhost:5173/verify-email'),
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: Joi.number().integer().min(5).default(60),
});
