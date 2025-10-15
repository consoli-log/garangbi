import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID'),
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('SERVER_URL') ?? 'http://localhost:3000'}/api/auth/kakao/callback`,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any) => void,
  ) {
    const kakaoAccount = profile._json?.kakao_account;
    const email: string | undefined = kakaoAccount?.email;

    if (!email) {
      return done(new Error('카카오 계정에서 이메일을 확인할 수 없습니다.'));
    }

    try {
      let user = await this.prisma.user.findUnique({
        where: { providerId: profile.id },
      });

      if (user) {
        return done(null, user);
      }

      user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        const updated = await this.prisma.user.update({
          where: { email },
          data: {
            provider: 'kakao',
            providerId: profile.id,
            isActive: true,
          },
        });
        return done(null, updated);
      }

      const baseNickname =
        profile.username ||
        kakaoAccount?.profile?.nickname ||
        email.split('@')[0];

      const sanitizedNickname = baseNickname.replace(/[^0-9a-zA-Z가-힣]/g, '');
      const nicknameCandidate = `${sanitizedNickname || 'kakao'}_${Math.floor(Math.random() * 1000)}`;

      const newUser = await this.prisma.user.create({
        data: {
          provider: 'kakao',
          providerId: profile.id,
          email,
          nickname: nicknameCandidate,
          isActive: true,
        },
      });

      return done(null, newUser);
    } catch (error) {
      return done(error, false);
    }
  }
}
