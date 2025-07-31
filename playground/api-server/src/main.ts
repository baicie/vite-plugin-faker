import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局管道验证
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 设置API文档
  const config = new DocumentBuilder()
    .setTitle('Faker API')
    .setDescription('用于测试的API接口')
    .setVersion('1.0')
    .addTag('用户管理')
    .addTag('商品管理')
    .addTag('订单管理')
    .addTag('用户认证')
    .addTag('文件上传')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 启用CORS
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
