/**
 * Module: Loans Domain Service
 * Responsibility: Implements domain orchestration for loans: creates new records,
 * retrieves scoped loan collections, and executes repayments. Enforces 404 Not Found
 * when a loan is missing or belongs to another user (preventing ID probing attacks).
 */

import { loansRepository, LoanRecord } from './loans.repository';
import { CreateLoanInput } from './loans.validation';
import { NotFoundError } from '../../utils/errors';

export interface FormattedLoan {
  id: string;
  userId: string;
  friendName: string;
  amount: number;
  amountFormatted: string;
  dueDate: string;
  status: 'pending' | 'repaid';
  repaidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  isOverdue: boolean;
}

function formatLoan(record: LoanRecord): FormattedLoan {
  const numericAmount = parseFloat(record.amount);
  return {
    id: record.id,
    userId: record.user_id,
    friendName: record.friend_name,
    amount: numericAmount,
    amountFormatted: numericAmount.toFixed(2),
    dueDate: record.due_date,
    status: record.status,
    repaidAt: record.repaid_at,
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    isOverdue: Boolean(record.is_overdue),
  };
}

export class LoansService {
  async createLoan(userId: string, input: CreateLoanInput): Promise<FormattedLoan> {
    const record = await loansRepository.create(
      userId,
      input.friendName,
      input.amount,
      input.dueDate,
      input.notes
    );
    return formatLoan(record);
  }

  async getLoans(userId: string): Promise<FormattedLoan[]> {
    const records = await loansRepository.findByUserId(userId);
    return records.map(formatLoan);
  }

  async repayLoan(userId: string, loanId: string): Promise<FormattedLoan> {
    const record = await loansRepository.markRepaid(userId, loanId);

    if (!record) {
      // 404 instead of 403 prevents attackers from enumerating loan UUIDs across users
      throw new NotFoundError('Loan not found');
    }

    return formatLoan(record);
  }
}

export const loansService = new LoansService();
