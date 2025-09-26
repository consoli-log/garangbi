import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails } = profile;
    const email = emails[0].value;

    let user = await this.prisma.user.findUnique({
      where: { providerId: id },
    });

    if (!user) {
      // 새로운 사용자인 경우, 계정을 생성합니다.
      user = await this.prisma.user.create({
        data: {
          provider: 'google',
          providerId: id,
          email: email,
          nickname: name.givenName,
          isActive: true, // 구글이 이메일을 인증했으므로 바로 활성화
        },
      });
    }

    done(null, user);
  }
}