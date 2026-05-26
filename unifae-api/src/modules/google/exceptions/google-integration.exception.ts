import { HttpException, HttpStatus } from '@nestjs/common';

export class GoogleIntegrationException extends HttpException {
  constructor(message: string, cause?: unknown) {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        error: 'GoogleIntegrationError',
        message,
        cause: cause instanceof Error ? cause.message : undefined,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
