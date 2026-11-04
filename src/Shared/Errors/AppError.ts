import type { ErrorCode } from "./ErrorCodes";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(
    code: ErrorCode,
    statusCode: number,
    message: string,
    details: unknown = null,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
