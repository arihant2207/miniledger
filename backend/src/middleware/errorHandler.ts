/**
 * Module: Centralized Error Handler Middleware
 * Responsibility: Catches all synchronous and asynchronous errors occurring in the request
 * pipeline and formats them into the standard error envelope `{ error: { code, message } }`.
 * Sanitizes unexpected runtime exceptions to avoid leaking internal stack traces.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<ErrorResponseBody>,
  _next: NextFunction
): void {
  // Domain operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Zod request validation failures at the route edge
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    const primaryMessage = formattedErrors[0]?.message ?? 'Invalid request parameters';

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: primaryMessage,
        details: formattedErrors,
      },
    });
    return;
  }

  // Malformed JSON body in incoming HTTP request
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload in request body',
      },
    });
    return;
  }

  // Unhandled internal server errors
  const errorObj = err instanceof Error ? err : new Error(String(err));
  logger.error('Unhandled internal server error', {
    message: errorObj.message,
    stack: errorObj.stack,
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
}
