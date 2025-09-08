import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
