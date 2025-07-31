import { ConflictException, Injectable } from '@nestjs/common';
import type { RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  // 模拟用户数据
  private users = [
    {
      id: 1,
      username: 'admin',
      password: '123456',
      email: 'admin@example.com',
      role: 'admin',
    },
    {
      id: 2,
      username: 'user',
      password: '123456',
      email: 'user@example.com',
      role: 'user',
    },
  ];

  async login(username: string, password: string) {
    // 在实际应用中，密码应该进行哈希比较
    const user = this.users.find(
      (u) => u.username === username && u.password === password,
    );

    if (!user) {
      return null;
    }

    // 生成模拟的token
    const token = Buffer.from(`${username}-${Date.now()}`).toString('base64');

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // 检查用户名和邮箱是否已存在
    const existingUser = this.users.find(
      (u) =>
        u.username === registerDto.username || u.email === registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    // 创建新用户
    const newUser = {
      id: this.users.length + 1,
      username: registerDto.username,
      password: registerDto.password, // 实际应用中应该哈希处理
      email: registerDto.email,
      role: 'user',
    };

    this.users.push(newUser);

    return {
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    };
  }
}
