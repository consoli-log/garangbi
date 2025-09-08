import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service.js';

const RegisterDto = z.object({
  email: z.string().email(),
  nickname: z.string().min(2).max(10),
  password: z.string().min(8).max(16)
});

const LoginDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(64)
});

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const dto = RegisterDto.parse(body);
    return this.auth.register(dto.email, dto.nickname, dto.password);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const dto = LoginDto.parse(body);
    return this.auth.login(dto.email, dto.password);
  }
}
