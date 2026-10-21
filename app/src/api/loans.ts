/**
 * Module: Loans & Summary API Endpoints
 * Responsibility: Typed API caller functions for loan creation, retrieval, repayment,
 * and portfolio summary aggregation.
 */

import { apiClient } from './client';
import { Loan, PortfolioSummary, CreateLoanPayload } from './types';

export const loansApi = {
  async createLoan(payload: CreateLoanPayload): Promise<Loan> {
    return apiClient<Loan>('loans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getLoans(): Promise<Loan[]> {
    return apiClient<Loan[]>('loans', {
      method: 'GET',
    });
  },

  async repayLoan(id: string): Promise<Loan> {
    return apiClient<Loan>(`loans/${id}/repay`, {
      method: 'PATCH',
    });
  },

  async getSummary(): Promise<PortfolioSummary> {
    return apiClient<PortfolioSummary>('summary', {
      method: 'GET',
    });
  },
};
