import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailSignupDto } from './dto/email-signup.dto';
import { EmailCheckDto } from './dto/email-check.dto';

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
}
