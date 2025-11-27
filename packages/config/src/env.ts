export type AppEnv = 'dev' | 'test' | 'prod';

export const APP_ENV: AppEnv =
  (process.env.NODE_ENV as AppEnv | undefined) ?? 'dev';

export const isDev = APP_ENV === 'dev';
export const isTest = APP_ENV === 'test';
export const isProd = APP_ENV === 'prod';
