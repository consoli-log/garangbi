import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get<string>('EMAIL_SERVICE'),
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `http://localhost:5173/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"가랑비" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: email,
      subject: '[가랑비] 회원가입을 완료하려면 이메일을 인증해주세요.',
      html: `
        <h1>가랑비에 오신 것을 환영합니다!</h1>
        <p>아래 버튼을 클릭하여 회원가입을 완료해주세요.</p>
        <a href="${verificationLink}" 
           style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
          이메일 인증하기
        </a>
        <p>이 링크는 1시간 동안 유효합니다.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`인증 메일 발송 성공: ${info.messageId}`);
    } catch (error) {
      this.logger.error('인증 메일 발송 실패', error.stack);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    const mailOptions = {
      from: `"가랑비" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: email,
      subject: '[가랑비] 비밀번호 재설정 안내',
      html: `
        <h1>비밀번호 재설정</h1>
        <p>비밀번호를 재설정하려면 아래 버튼을 클릭하세요.</p>
        <a href="${resetLink}" 
           style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
          비밀번호 재설정하기
        </a>
        <p>이 링크는 1시간 동안 유효합니다.</p>
        <p>만약 요청하지 않으셨다면 이 이메일을 무시해주세요.</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`비밀번호 재설정 메일 발송 성공: ${info.messageId}`);
    } catch (error) {
      this.logger.error('비밀번호 재설정 메일 발송 실패', error.stack);
    }
  }
}