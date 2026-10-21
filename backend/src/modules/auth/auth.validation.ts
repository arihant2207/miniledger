/**
 * Module: Auth Validation Schemas
 * Responsibility: Validates incoming payloads for OTP generation and verification.
 * Enforces strict phone number formatting (E.164 / 10-15 digits) and exact 6-digit numeric OTPs.
 */

import { z } from 'zod';

// Accepts international E.164 format (e.g. +919876543210) or national format (e.g. 9876543210)
export const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .transform((val) => val.replace(/[\s-]/g, '')) // Normalize by stripping internal whitespace and dashes
  .refine((val) => /^\+?[1-9]\d{9,14}$/.test(val), {
    message: 'Invalid phone number format. Must be between 10 and 15 digits (e.g., +919876543210 or 9876543210)',
  });

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 numeric digits'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
