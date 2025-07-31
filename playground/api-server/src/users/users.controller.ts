import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { UsersService } from './users.service';
import type { UserFilterDto } from './dto/user.dto';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('用户管理')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '获取用户列表', description: '支持分页和过滤' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量' })
  @ApiQuery({ name: 'name', required: false, description: '用户名过滤' })
  @ApiResponse({ status: 200, description: '返回用户列表' })
  getUsers(@Query() filter: UserFilterDto) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '返回用户信息' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = this.usersService.findById(id);
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: '用户创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: '用户更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '用户删除成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
