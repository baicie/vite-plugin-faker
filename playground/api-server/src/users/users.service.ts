import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateUserDto,
  UpdateUserDto,
  UserFilterDto,
} from './dto/user.dto';
import type { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      age: 28,
      createdAt: new Date(),
    },
    {
      id: 2,
      name: '李四',
      email: 'lisi@example.com',
      age: 32,
      createdAt: new Date(),
    },
    {
      id: 3,
      name: '王五',
      email: 'wangwu@example.com',
      age: 25,
      createdAt: new Date(),
    },
  ];

  findAll(filter: UserFilterDto) {
    let filteredUsers = [...this.users];

    if (filter.name) {
      filteredUsers = filteredUsers.filter((user) =>
        user.name.includes(filter.name),
      );
    }

    // 计算分页
    const total = filteredUsers.length;
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const skip = (page - 1) * limit;

    const data = filteredUsers.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findById(id: number): User {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }
    return user;
  }

  create(createUserDto: CreateUserDto): User {
    const newId =
      this.users.length > 0 ? Math.max(...this.users.map((u) => u.id)) + 1 : 1;

    const newUser: User = {
      id: newId,
      ...createUserDto,
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return newUser;
  }

  update(id: number, updateUserDto: UpdateUserDto): User {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateUserDto,
    };

    return this.users[userIndex];
  }

  remove(id: number): { success: boolean } {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) {
      throw new NotFoundException(`用户ID ${id} 不存在`);
    }

    this.users.splice(userIndex, 1);
    return { success: true };
  }
}
