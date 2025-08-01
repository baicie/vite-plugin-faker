import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    // TypeORM sql.js 配置
    TypeOrmModule.forRoot({
      type: 'sqljs',
      database: new Uint8Array(), // 内存数据库
      location: 'database.sqljs', // 可选：持久化到文件
      autoSave: true, // 自动保存到文件
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // 开发环境自动同步数据库结构
      logging: process.env.NODE_ENV === 'development',
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    }),
    UsersModule,
    ProductsModule,
    OrdersModule,
    AuthModule,
    UploadsModule,
  ],
})
export class AppModule {}
