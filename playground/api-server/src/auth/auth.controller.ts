import {
  Body,
  Controller,
  HttpCode,
  Post,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthService } from './auth.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

@ApiTags('用户认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '登录失败' })
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    const result = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );
    if (!result) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return result;
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '注册失败' })
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
}
