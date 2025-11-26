import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor'; // 신규 작성
import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // 신규 작성

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor()); // 신규 작성
  app.useGlobalFilters(new HttpExceptionFilter()); // 신규 작성

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
