import { Controller, Get, Headers } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { JwtService } from '@nestjs/jwt';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService, private jwt: JwtService) {}

  @Get('me')
  async me(@Headers('authorization') auth?: string) {
    if (!auth?.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    try {
      const payload = await this.jwt.verifyAsync(token);
      return this.users.me(payload.sub);
    } catch {
      return null;
    }
  }
}
