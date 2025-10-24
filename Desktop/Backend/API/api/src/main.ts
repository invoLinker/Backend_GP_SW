import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
config();


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ------------------------
  // Global ValidationPipe
  // ------------------------
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,               // يحذف أي خصائص غير موجودة بالـ DTO
    forbidNonWhitelisted: true,    // يطلع خطأ لو في خصائص غير معرفة
    transform: true,               // يحول القيم تلقائياً للأنواع الصحيحة
  }));

  // ------------------------
  // Swagger Setup
  // ------------------------
  const config = new DocumentBuilder()
    .setTitle('My API')                    // عنوان الـ API
    .setDescription('API documentation')   // وصف
    .setVersion('1.0')                     // نسخة
    .addBearerAuth()                        // JWT authentication (اختياري)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // رابط Swagger: /api-docs

  // ------------------------
  // Start the app
  // ------------------------
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
