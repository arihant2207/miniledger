/**
 * Module: Auth HTTP Controller
 * Responsibility: Handles incoming HTTP requests for the authentication module, delegates
 * domain processing to AuthService, and formats successful HTTP responses.
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { RequestOtpInput, VerifyOtpInput } from './auth.validation';

export const authController = {
  /**
   * Endpoint: POST /auth/request-otp
   */
  async requestOtp(
    req: Request<unknown, unknown, RequestOtpInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.requestOtp(req.body.phone);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Endpoint: POST /auth/verify-otp
   */
  async verifyOtp(
    req: Request<unknown, unknown, VerifyOtpInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body.phone, req.body.otp);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
