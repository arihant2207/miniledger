/**
 * Module: Loans HTTP Controller
 * Responsibility: Handles HTTP requests for loan operations, extracts authenticated
 * user context, delegates business logic to LoansService, and returns standard JSON responses.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { loansService } from './loans.service';
import { CreateLoanInput } from './loans.validation';

export const loansController = {
  async createLoan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const loan = await loansService.createLoan(req.userId, req.body as CreateLoanInput);
      res.status(201).json({
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  },

  async getLoans(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const loans = await loansService.getLoans(req.userId);
      res.status(200).json({
        data: loans,
      });
    } catch (error) {
      next(error);
    }
  },

  async repayLoan(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const loan = await loansService.repayLoan(req.userId, req.params.id!);
      res.status(200).json({
        data: loan,
      });
    } catch (error) {
      next(error);
    }
  },
};
