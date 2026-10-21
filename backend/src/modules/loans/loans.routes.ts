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

const router = Router();

// Apply authentication to all loan routes
router.use(authenticate);

router.post(
  '/',
  validateBody(createLoanSchema),
  loansController.createLoan as unknown as (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void
);

router.get(
  '/',
  loansController.getLoans as unknown as (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void
);

router.patch(
  '/:id/repay',
  validateParams(loanIdParamSchema),
  loansController.repayLoan as unknown as (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void
);

export const loansRoutes = router;
