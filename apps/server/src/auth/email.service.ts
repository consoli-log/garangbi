import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail, { MailDataRequired } from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly frontendUrl: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.senderEmail = this.configService.get<string>('EMAIL_FROM') ?? '';
    this.senderName = this.configService.get<string>('EMAIL_FROM_NAME') ?? '가랑비';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    if (!apiKey || !this.senderEmail) {
      this.logger.error(
        'SendGrid 메일 설정이 누락되었습니다. SENDGRID_API_KEY와 EMAIL_FROM을 확인해주세요.',
      );
      this.isConfigured = false;
      return;
    }

    sgMail.setApiKey(apiKey);
    this.isConfigured = true;
  }

  private ensureConfigured() {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        '메일 발송 설정이 완료되지 않았습니다. 관리자에게 문의해주세요.',
      );
    }
  }

  private async sendMail(payload: MailDataRequired) {
    this.ensureConfigured();

    try {
      await sgMail.send({
        ...payload,
        from: {
          email: this.senderEmail,
          name: this.senderName,
        },
      });
    } catch (error) {
      this.logger.error('메일 발송 실패', error);
      throw new InternalServerErrorException('메일 발송 중 오류가 발생했습니다.');
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${this.frontendUrl}/auth/verify-email?token=${token}`;

    await this.sendMail({
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
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${this.frontendUrl}/reset-password?token=${token}`;

    await this.sendMail({
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
    });
  }

  async sendLedgerInvitationEmail(
    email: string,
    inviterName: string,
    ledgerName: string,
    token: string,
  ) {
    const acceptLink = `${this.frontendUrl}/invitations/accept?token=${token}`;

    await this.sendMail({
      to: email,
      subject: `[가랑비] ${inviterName}님이 ${ledgerName} 가계부에 초대했습니다.`,
      html: `
        <h1>${inviterName}님이 ${ledgerName} 가계부에 초대했습니다.</h1>
        <p>아래 버튼을 클릭하여 초대를 수락하고 가계부에 참여하세요.</p>
        <a href="${acceptLink}"
           style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;">
          초대 수락하기
        </a>
        <p>이 링크는 7일 동안 유효합니다.</p>
      `,
    });
  }
}
