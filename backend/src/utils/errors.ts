/**
 * Module: Application Error Classes
 * Responsibility: Defines typed domain error classes derived from an abstract AppError base.
 * Guarantees that all known failure modes carry an explicit HTTP status code, domain error code,
 * and optional validation/diagnostic details for the central error handler.
 */

export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  public readonly statusCode = 400;
  public readonly code = 'BAD_REQUEST';
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly code = 'CONFLICT';
}

export class RateLimitError extends AppError {
  public readonly statusCode = 429;
  public readonly code = 'RATE_LIMIT_EXCEEDED';
}

export class InternalServerError extends AppError {
  public readonly statusCode = 500;
  public readonly code = 'INTERNAL_SERVER_ERROR';
}
