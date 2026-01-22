import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정 (프론트엔드와 통신)
  app.enableCors({
    origin: 'http://localhost:3000', // Next.js 프론트엔드
    credentials: true, // 쿠키 허용
  });

  // 쿠키 파서
  app.use(cookieParser());

  // 전역 유효성 검사 파이프
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 속성 제거
      forbidNonWhitelisted: true, // DTO에 없는 속성이 있으면 에러
      transform: true, // 자동 타입 변환
    }),
  );

  // API 접두사
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Backend server running on http://localhost:${port}`);
}
bootstrap();
