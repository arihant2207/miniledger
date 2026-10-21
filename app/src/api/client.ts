/**
 * Module: HTTP Client
 * Responsibility: Centralizes all network communication:
 * - Injects Bearer token automatically from SecureStore
 * - Routes all errors through a single normalization pipeline
 * - Emits 401 unauthorized notifications to auto-expire sessions
 */

import { storage } from '../utils/storage';
import { ApiError } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorizedCallback: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorizedCallback = handler;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await storage.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netError) {
    throw new ApiClientError(0, {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to MiniLedger server. Please check your connection.',
    });
  }

  // Handle 401 Unauthorized globally
  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiClientError(response.status, {
        code: 'HTTP_ERROR',
        message: `Request failed with status ${response.status}`,
      });
    }
    return {} as T;
  }

  if (!response.ok || body.error) {
    const errorPayload = body.error ?? {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected server error occurred',
    };
    throw new ApiClientError(response.status, errorPayload);
  }

  return body.data as T;
}
