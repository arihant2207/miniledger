/**
 * Module: Auth API Endpoints
 * Responsibility: Typed API caller functions for authentication operations.
 */

import { apiClient } from './client';
import { RequestOtpResponse, VerifyOtpResponse } from './types';

export const authApi = {
  async requestOtp(phone: string): Promise<RequestOtpResponse> {
    return apiClient<RequestOtpResponse>('auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    return apiClient<VerifyOtpResponse>('auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  },
};
