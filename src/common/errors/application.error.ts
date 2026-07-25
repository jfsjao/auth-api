export interface ErrorDetail {
  field?: string;
  code?: string;
  message: string;
}

export class ApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
