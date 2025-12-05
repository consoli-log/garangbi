import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code: string | undefined;
    let extra: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as any;
        message = r.message ?? message;
        code = r.code ?? code;
        // 추가 필드(예: canResend 등)는 그대로 전달해 클라이언트 분기 용도로 활용.
        extra = Object.fromEntries(
          Object.entries(r).filter(([key]) => key !== 'message' && key !== 'code'),
        );
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code: code ?? `HTTP_${status}`,
        message,
        status,
        path: (request as any)?.url,
        timestamp: new Date().toISOString(),
        ...extra,
      },
    });
  }
}
