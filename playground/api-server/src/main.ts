import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';

async function seedDatabase(app: any) {
  // 获取数据源
  const dataSource = app.get(DataSource);

  // 获取repositories
  const userRepo = dataSource.getRepository(User);
  const productRepo = dataSource.getRepository(Product);
  const orderRepo = dataSource.getRepository(Order);
  const orderItemRepo = dataSource.getRepository(OrderItem);

  const userCount = await userRepo.count();
  const productCount = await productRepo.count();
  const orderCount = await orderRepo.count();

  if (userCount === 0) {
    await userRepo.save([
      { name: '张三', email: 'zhangsan@example.com', age: 28 },
      { name: '李四', email: 'lisi@example.com', age: 32 },
      { name: '王五', email: 'wangwu@example.com', age: 25 },
    ]);
    console.log('用户种子数据已创建');
  }

  if (productCount === 0) {
    await productRepo.save([
      {
        name: 'iPhone 14',
        price: 5999,
        category: '手机',
        description: 'Apple最新款手机',
        stock: 100,
      },
      {
        name: 'MacBook Pro',
        price: 12999,
        category: '电脑',
        description: '专业人士的首选',
        stock: 50,
      },
      {
        name: 'iPad Air',
        price: 4399,
        category: '平板',
        description: '轻薄强大的平板电脑',
        stock: 75,
      },
    ]);
    console.log('商品种子数据已创建');
  }

  if (orderCount === 0) {
    // 创建示例订单
    const orders = await orderRepo.save([
      {
        userId: 1,
        totalAmount: 5999,
        status: 'paid',
        address: '北京市朝阳区XX街道',
      },
      {
        userId: 2,
        totalAmount: 12999,
        status: 'shipped',
        address: '上海市浦东新区XX路',
      },
      {
        userId: 1,
        totalAmount: 8798,
        status: 'pending',
        address: '北京市朝阳区XX街道',
      },
    ]);

    // 为每个订单创建订单项
    await orderItemRepo.save([
      {
        productId: 1,
        name: 'iPhone 14',
        price: 5999,
        quantity: 1,
        order: orders[0],
      },
      {
        productId: 2,
        name: 'MacBook Pro',
        price: 12999,
        quantity: 1,
        order: orders[1],
      },
      {
        productId: 3,
        name: 'iPad Air',
        price: 4399,
        quantity: 2,
        order: orders[2],
      },
    ]);

    console.log('订单种子数据已创建');
  }
}

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

  // 初始化种子数据
  try {
    await seedDatabase(app);
  } catch (error) {
    console.log('种子数据初始化跳过:', error.message);
  }

  await app.listen(3000);
  console.log('服务器启动在 http://localhost:3000');
  console.log('API文档地址: http://localhost:3000/api');
}
bootstrap();
