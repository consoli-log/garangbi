import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('dev', 'test', 'prod').default('dev'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
});
