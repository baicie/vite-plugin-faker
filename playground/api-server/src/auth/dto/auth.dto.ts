import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'newuser' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @Matches(/^[\w-]+$/, { message: '用户名只能包含字母、数字、下划线和连字符' })
  username: string;

  @ApiProperty({ description: '邮箱', example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '密码', example: 'Password123' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z0-9])/, {
    message: '密码必须包含大小写字母或数字',
  })
  password: string;
}
