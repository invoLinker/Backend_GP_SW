import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config } from 'dotenv';
config();
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as express from 'express';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve uploads folder dynamically
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,              
    forbidNonWhitelisted: true,    
    transform: true,               
  }));




  const config = new DocumentBuilder()
    .setTitle('My API')                    
    .setDescription('API documentation')   
    .setVersion('1.0')                    
    .addBearerAuth()                      
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); 

 
 await app.listen(process.env.PORT ?? 4000, '0.0.0.0');

}

bootstrap();
