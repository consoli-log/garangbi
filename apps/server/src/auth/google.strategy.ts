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
      callbackURL: `${configService.get<string>('SERVER_URL') ?? 'http://localhost:3000'}/api/auth/google/callback`,
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

    try {
      let user = await this.prisma.user.findUnique({
        where: { providerId: id },
      });

      if (user) {
        return done(null, user);
      }

      user = await this.prisma.user.findUnique({ where: { email } });

      if (user) {
        const updatedUser = await this.prisma.user.update({
          where: { email: email },
          data: { provider: 'google', providerId: id },
        });
        return done(null, updatedUser);
      }

      const newUser = await this.prisma.user.create({
        data: {
          provider: 'google',
          providerId: id,
          email: email,
          nickname: `${name.givenName}_${Math.floor(Math.random() * 1000)}`, // 닉네임 중복 방지
          isActive: true,
          onboardingCompleted: false,
          termsAgreedAt: null,
          privacyAgreedAt: null,
        },
      });
      return done(null, newUser);

    } catch (error) {
      return done(error, false);
    }
  }
}
