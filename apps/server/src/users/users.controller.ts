import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@Req() req: Request) {
    return this.usersService.getMe((req.user as any).id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/profile')
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile((req.user as any).id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me/password')
  async updatePassword(@Req() req: Request, @Body() dto: UpdatePasswordDto) {
    await this.usersService.updatePassword((req.user as any).id, dto);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/verify-password')
  verifyPassword(@Req() req: Request, @Body() dto: VerifyPasswordDto) {
    return this.usersService.verifyPassword((req.user as any).id, dto.password);
  }
}
