import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { CompleteSocialOnboardingDto } from '../auth/dto/complete-social-onboarding.dto';

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

  @UseGuards(AuthGuard('jwt'))
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: Request, @Body() dto: DeleteAccountDto) {
    await this.usersService.deleteAccount((req.user as any).id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('me/social-onboarding')
  @HttpCode(HttpStatus.OK)
  async completeSocialOnboarding(@Req() req: Request, @Body() dto: CompleteSocialOnboardingDto) {
    return this.usersService.completeSocialOnboarding((req.user as any).id, dto);
  }
}
