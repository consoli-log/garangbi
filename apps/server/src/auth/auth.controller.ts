import { Body, Controller, Post, Get, Query, Req, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express'; 
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
import { CompleteSocialOnboardingDto } from './dto/complete-social-onboarding.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!req.user) {
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }

    const { accessToken, onboardingCompleted } = await this.authService.socialLogin(req.user);

    const onboardingFlag = onboardingCompleted ? '0' : '1';
    res.redirect(`${frontendUrl}/auth/social-callback?token=${accessToken}&onboarding=${onboardingFlag}`);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuth() {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoAuthRedirect(@Req() req, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!req.user) {
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }

    const { accessToken, onboardingCompleted } = await this.authService.socialLogin(req.user);
    const onboardingFlag = onboardingCompleted ? '0' : '1';
    return res.redirect(`${frontendUrl}/auth/social-callback?token=${accessToken}&onboarding=${onboardingFlag}`);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmailAvailability(email);
  }

  @Get('check-nickname')
  async checkNickname(@Query('nickname') nickname: string) {
    return this.authService.checkNicknameAvailability(nickname);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }
  
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('social-onboarding')
  async completeSocialOnboarding(@Req() req, @Body() dto: CompleteSocialOnboardingDto) {
    return this.authService.completeSocialOnboarding(req.user.id, dto);
  }
}
