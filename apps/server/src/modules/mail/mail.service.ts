import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import mailConfig from '../../config/mail.config';

interface EmailVerificationPayload {
  email: string;
  verificationUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(mailConfig.KEY)
    private readonly config: ConfigType<typeof mailConfig>,
  ) {}

  async sendEmailVerification(payload: EmailVerificationPayload): Promise<void> {
    if (this.config.provider === 'sendgrid') {
      await this.sendViaSendgrid(payload);
      return;
    }

    this.logger.log(
      `이메일 인증 메일 전송(로그 모드): ${payload.email} -> ${payload.verificationUrl}`,
    );
  }

  private async sendViaSendgrid(payload: EmailVerificationPayload): Promise<void> {
    if (!this.config.sendgrid.apiKey) {
      this.logger.error('SendGrid API 키가 설정되지 않았습니다.');
      throw new InternalServerErrorException('메일 발송 설정이 완료되지 않았습니다.');
    }

    const { subject, text, html } = this.buildEmailTemplates(payload.verificationUrl);
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.sendgrid.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.email }],
          },
        ],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject,
        content: [
          {
            type: 'text/plain',
            value: text,
          },
          {
            type: 'text/html',
            value: html,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(
        `SendGrid 전송 실패: ${response.status} ${response.statusText} - ${errorText}`,
      );
      throw new InternalServerErrorException(
        '인증 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      );
    }
  }

  private buildEmailTemplates(verificationUrl: string) {
    const subject = '쪼개부기 이메일 인증을 완료해 주세요';
    const text = [
      '쪼개부기을 이용해 주셔서 감사합니다.',
      '아래 링크를 클릭하거나 브라우저에 복사해 이메일 인증을 완료해 주세요.',
      verificationUrl,
      '',
      '이 링크는 일정 시간이 지나면 만료됩니다.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111">
        <h2 style="color: #5f2eea;">쪼개부기 이메일 인증</h2>
        <p>쪼개부기 가입을 환영합니다. 아래 버튼을 눌러 인증을 완료해 주세요.</p>
        <p style="margin: 24px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #5f2eea; color: #fff; text-decoration: none; border-radius: 8px;">이메일 인증하기</a>
        </p>
        <p>버튼이 동작하지 않으면 아래 링크를 복사해 사용하세요.</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p style="margin-top: 32px; color: #555;">이 링크는 일정 시간이 지나면 만료됩니다.</p>
      </div>
    `.trim();

    return { subject, text, html };
  }
}
