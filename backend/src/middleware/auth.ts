/**
 * Module: Authentication Middleware
 * Responsibility: Validates Bearer JWT tokens in incoming Authorization headers,
 * verifies cryptographic signatures using the validated JWT_SECRET, and attaches the
 * authenticated user ID and phone to the Request object for downstream scoped queries.
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userPhone: string;
}

interface MiniLedgerJwtPayload extends JwtPayload {
  sub: string;
  phone: string;
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next(new UnauthorizedError('Authorization header is missing'));
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new UnauthorizedError('Authorization format must be: Bearer <token>'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as MiniLedgerJwtPayload;

    if (!decoded.sub || !decoded.phone) {
      next(new UnauthorizedError('Invalid token payload: missing user identity'));
      return;
    }

    // Attach verified user identity directly to request
    (req as AuthenticatedRequest).userId = decoded.sub;
    (req as AuthenticatedRequest).userPhone = decoded.phone;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired. Please log in again.'));
      return;
    }
    next(new UnauthorizedError('Invalid authentication token'));
  }
}
