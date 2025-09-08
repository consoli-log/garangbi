import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, nickname: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new UnauthorizedException('Email already exists');
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: { email, nickname, passwordHash, isActive: true }
    });
    return { id: user.id };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken, user: { id: user.id, email: user.email, nickname: user.nickname } };
  }
}
