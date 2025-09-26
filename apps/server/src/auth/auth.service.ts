import { ConflictException, Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from '@garangbi/types';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../../node_modules/.prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async socialLogin(userFromProvider: User) {
    if (!userFromProvider) {
      throw new UnauthorizedException('소셜 로그인에 실패했습니다.');
    }
    const payload = { sub: userFromProvider.id, email: userFromProvider.email };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async register(registerDto: RegisterDto) {
    const { email, nickname, password } = registerDto;

    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const existingUserByNickname = await this.prisma.user.findUnique({
      where: { nickname },
    });
    if (existingUserByNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 3600000);

    const user = await this.prisma.user.create({
      data: {
        email,
        nickname,
        password: hashedPassword,
        isActive: false,
        emailVerificationToken,
        emailVerificationExpires,
      },
    });

    await this.emailService.sendVerificationEmail(email, emailVerificationToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호를 확인해주세요.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('아직 이메일 인증이 완료되지 않았습니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호를 확인해주세요.');
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('유효하지 않은 인증 토큰입니다.');
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new BadRequestException('인증 토큰이 만료되었습니다.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: '이메일 인증이 성공적으로 완료되었습니다.' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: '비밀번호 재설정 이메일이 발송되었습니다.' };
    }

    const passwordResetToken = crypto.randomBytes(32).toString('hex');
    const passwordResetExpires = new Date(Date.now() + 3600000); // 1시간 후 만료

    await this.prisma.user.update({
      where: { email },
      data: {
        passwordResetToken,
        passwordResetExpires,
      },
    });

    await this.emailService.sendPasswordResetEmail(email, passwordResetToken);

    return { message: '비밀번호 재설정 이메일이 발송되었습니다.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: token },
    });

    if (!user || new Date() > user.passwordResetExpires) {
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return { message: '비밀번호가 성공적으로 재설정되었습니다.' };
  }
}
