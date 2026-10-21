/**
 * Module: Summary Domain Service
 * Responsibility: Coordinates retrieval and formatting of loan portfolio summaries.
 * Converts exact database NUMERIC strings into structured financial figures.
 */

import { summaryRepository } from './summary.repository';

export interface PortfolioSummary {
  totalLent: number;
  totalLentFormatted: string;
  totalRepaid: number;
  totalRepaidFormatted: string;
  totalOverdue: number;
  totalOverdueFormatted: string;
}

export class SummaryService {
  async getSummary(userId: string): Promise<PortfolioSummary> {
    const record = await summaryRepository.getSummary(userId);

    const lent = parseFloat(record.total_lent);
    const repaid = parseFloat(record.total_repaid);
    const overdue = parseFloat(record.total_overdue);

    return {
      totalLent: lent,
      totalLentFormatted: lent.toFixed(2),
      totalRepaid: repaid,
      totalRepaidFormatted: repaid.toFixed(2),
      totalOverdue: overdue,
      totalOverdueFormatted: overdue.toFixed(2),
    };
  }
}

export const summaryService = new SummaryService();
