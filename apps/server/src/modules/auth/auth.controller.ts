import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailSignupDto } from './dto/email-signup.dto';
import { EmailCheckDto } from './dto/email-check.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { NicknameCheckDto } from './dto/nickname-check.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email-signup')
  @HttpCode(HttpStatus.CREATED)
  emailSignup(@Body() dto: EmailSignupDto) {
    return this.authService.emailSignup(dto);
  }

  @Post('email-check')
  @HttpCode(HttpStatus.OK)
  checkEmail(@Body() dto: EmailCheckDto) {
    return this.authService.checkEmailAvailability(dto.email);
  }

  @Post('nickname-check')
  @HttpCode(HttpStatus.OK)
  checkNickname(@Body() dto: NicknameCheckDto) {
    return this.authService.checkNicknameAvailability(dto.nickname);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendEmailVerification(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
