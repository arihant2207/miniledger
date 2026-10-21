/**
 * Module: API Domain Types
 * Responsibility: Strongly types all payloads, responses, and error shapes exchanged
 * between the React Native client and the MiniLedger backend.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface User {
  id: string;
  phone: string;
  createdAt: string;
}

export interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  token: string;
  user: User;
}

export interface Loan {
  id: string;
  userId: string;
  friendName: string;
  amount: number;
  amountFormatted: string;
  dueDate: string;
  status: 'pending' | 'repaid';
  repaidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
}

export interface PortfolioSummary {
  totalLent: number;
  totalLentFormatted: string;
  totalRepaid: number;
  totalRepaidFormatted: string;
  totalOverdue: number;
  totalOverdueFormatted: string;
}

export interface CreateLoanPayload {
  friendName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  notes?: string;
}
