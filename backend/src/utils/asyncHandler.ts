/**
 * Module: Async Handler Utility
 * Responsibility: Wraps asynchronous Express route handlers to catch rejected
 * promises and forward them to next(), while preserving strict controller request types.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

export type AsyncRequestHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export function asyncHandler<Req extends Request = Request>(
  fn: AsyncRequestHandler<Req>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
