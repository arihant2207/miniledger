/**
 * Module: Loans Express Routes
 * Responsibility: Mounts loan management endpoints, protected by the authentication
 * middleware and edge validation schemas.
 */

import { Router } from 'express';
import { loansController } from './loans.controller';
import { authenticate } from '../../middleware/auth';
import { validateBody, validateParams } from '../../middleware/validate';
import { createLoanSchema, loanIdParamSchema } from './loans.validation';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// Apply authentication to all loan routes
router.use(authenticate);

router.post(
  '/',
  validateBody(createLoanSchema),
  asyncHandler(loansController.createLoan)
);

router.get(
  '/',
  asyncHandler(loansController.getLoans)
);

router.patch(
  '/:id/repay',
  validateParams(loanIdParamSchema),
  asyncHandler(loansController.repayLoan)
);

export const loansRoutes = router;
