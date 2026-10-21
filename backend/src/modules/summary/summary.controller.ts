/**
 * Module: Summary HTTP Controller
 * Responsibility: Handles HTTP requests for portfolio summaries, extracting authenticated
 * user context and returning aggregated financial metrics.
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth';
import { summaryService } from './summary.service';

export const summaryController = {
  async getSummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await summaryService.getSummary(req.userId);
      res.status(200).json({
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
};
