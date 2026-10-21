/**
 * Module: Auth Domain Service
 * Responsibility: Implements core authentication security controls:
 * - Cryptographically random 6-digit OTP generation (crypto.randomInt)
 * - HMAC-SHA256 OTP hashing to protect secrets in the database
 * - Constant-time comparison (crypto.timingSafeEqual) against timing attacks
 * - Sliding window rate limiting per phone number
 * - Hard attempt caps (max 5) and single-use consumption semantics
 * - Stateless JWT issuance with short-lived expiration
 */

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authRepository, UserRecord } from './auth.repository';
import { logger } from '../../utils/logger';
import { BadRequestError, RateLimitError } from '../../utils/errors';

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    phone: string;
    createdAt: Date;
  };
}

export class AuthService {
  /**
   * Generates a cryptographic HMAC-SHA256 digest of the 6-digit OTP.
   * Storing hashes instead of raw OTPs prevents database leaks from compromising active tokens.
   */
  private hashOtp(otp: string): string {
    return crypto.createHmac('sha256', env.JWT_SECRET).update(otp).digest('hex');
  }

  /**
   * Compares two hexadecimal hash strings using constant-time evaluation to eliminate timing side-channels.
   */
  private verifyHashConstantTime(candidateOtp: string, expectedHash: string): boolean {
    const candidateHash = this.hashOtp(candidateOtp);
    const candidateBuffer = Buffer.from(candidateHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    if (candidateBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  }

  /**
   * Requests a new 6-digit OTP for the given phone number with rate-limiting.
   */
  async requestOtp(phone: string): Promise<{ message: string; expiresInSeconds: number }> {
    // 1. Sliding window rate limiting: check requests within the configured window
    const windowStart = new Date(Date.now() - env.OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
    const recentCount = await authRepository.countRecentOtps(phone, windowStart);

    if (recentCount >= env.OTP_RATE_LIMIT_MAX_REQUESTS) {
      throw new RateLimitError(
        `Too many OTP requests for this phone number. Please wait ${env.OTP_RATE_LIMIT_WINDOW_MINUTES} minutes before requesting again.`
      );
    }

    // 2. Generate cryptographically secure 6-digit OTP (range 100000 to 999999)
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    // 3. Persist hashed OTP to PostgreSQL
    await authRepository.createOtp(phone, codeHash, expiresAt);

    // 4. Print mock OTP prominently in server logs for manual & automated testing
    logger.mockOtp(phone, rawOtp);

    return {
      message: 'OTP sent successfully. Check the server console log for the mock OTP.',
      expiresInSeconds: env.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verifies the provided 6-digit OTP against the most recent unconsumed request.
   */
  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const otpRecord = await authRepository.findLatestUnconsumedOtp(phone);

    // 1. Verify existence of active request
    if (!otpRecord) {
      throw new BadRequestError('No pending OTP request found for this phone number. Please request a new OTP.');
    }

    // 2. Enforce maximum verification attempts
    if (otpRecord.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new BadRequestError('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // 3. Check time-based expiration (5 minutes)
    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new BadRequestError('OTP has expired. Please request a new OTP.');
    }

    // 4. Constant-time hash verification
    const isValid = this.verifyHashConstantTime(otp, otpRecord.code_hash);

    if (!isValid) {
      const attemptsSoFar = await authRepository.incrementAttempts(otpRecord.id);
      const remaining = env.OTP_MAX_ATTEMPTS - attemptsSoFar;

      if (remaining <= 0) {
        throw new BadRequestError('Invalid OTP. Maximum attempts reached. Please request a new OTP.');
      }
      throw new BadRequestError(`Invalid OTP. ${remaining} attempt(s) remaining.`);
    }

    // 5. Single-use enforcement: mark consumed immediately upon success
    await authRepository.markConsumed(otpRecord.id);

    // 6. Resolve or create user identity
    const user: UserRecord = await authRepository.findOrCreateUser(phone);

    // 7. Issue signed short-lived JWT
    const signOptions: jwt.SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions['expiresIn']>,
    };

    const token = jwt.sign(
      {
        sub: user.id,
        phone: user.phone,
      },
      env.JWT_SECRET,
      signOptions
    );

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        createdAt: user.created_at,
      },
    };
  }
}

export const authService = new AuthService();
