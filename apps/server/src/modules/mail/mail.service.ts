import { Injectable, Logger } from '@nestjs/common';

interface EmailVerificationPayload {
  email: string;
  verificationUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendEmailVerification(payload: EmailVerificationPayload): Promise<void> {
    this.logger.log(`이메일 인증 메일 전송: ${payload.email} -> ${payload.verificationUrl}`);
  }
}

